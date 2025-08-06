#!/usr/bin/env node

import { program } from "commander";
import { red } from "colorette";
import inquirer from "inquirer";
import axios, {AxiosError} from "axios";
import * as fs from "node:fs";
import {getAllAudioScenario} from "./scenarios/get-all-audio.scenario.js";
import {controller, vkApiService} from "../lib/vk-api.service.js";
import chalk from 'chalk';
import * as path from "node:path";
import {getPlaylistTracksByLinkScenario} from "./scenarios/get-playlist-tracks.scenario.js";
import {getPlaylistTracksScenario} from "./scenarios/get-all-playlists-tracks.scenario.js";
import {getTrackByLinkScenario} from "./scenarios/get-track-by-link.scenario.js";

program.version("1.0.0").description("VK Audio Downloader");

function catchApiError(err, spinner) {
  if (err.code === 'ECONNREFUSED') {
    spinner.fail(`API is not reachable. Check servers or try again later.`);
    return;
  }
  if (err instanceof AxiosError) {
    spinner.fail(`API error: ${err.message}. ${JSON.stringify(err.response?.data || {})}`);
  }
}

async function retry(spinner, func, error) {
  catchApiError(error, spinner)

  const { choice } = await inquirer.prompt([
    {
      type: "list",
      name: "choice",
      message: "Retry?",
      choices: ["Yes", "No"],
    },
  ]);

  if (choice === "Yes") {
    await func(spinner);
  }
}

async function getSaveFolder(config) {
  const { savePath } = await inquirer.prompt([
    {
      type: "input",
      name: "savePath",
      message: "Введите путь для сохранения файлов: ",
    },
  ]);

  config['save_path'] = path.resolve(savePath);
  fs.writeFileSync('./config.json', JSON.stringify(config));
}

export async function mainMenu(config = global['myConfig']) {
  const choices = [
    "Скачать все треки из основного плейлиста",
    "Скачать все плейлисты",
    "🔗 Скачать трек по ссылке",
    "🔗 Скачать плейлист по ссылке",
    "⚙️ Показать путь для скачивания",
    "⚙️ Изменить путь для скачивания",
    "⚙️ Вывыести путь к приложению",
    "⚙️ Очистить весь кэш (удалит всё, кроме пути сохранения треков)",
    "🚪👋 Выход"
  ];

  const { choice } = await inquirer.prompt([
    {
      type: "list",
      name: "choice",
      message: "Выберите действие",
      choices
    },
  ]);

  await checkToken();

  if (choice === choices[0]) {
    await getAllAudioScenario(config['save_path'])
      .then(mainMenu)
  }

  if (choice === choices[1]) {
    await getPlaylistTracksScenario(config['save_path'])
      .then(mainMenu)
  }

  if (choice === choices[2]) {
    await getTrackByLinkScenario(config['save_path'])
      .then(mainMenu)
  }

  if (choice === choices[3]) {
    await getPlaylistTracksByLinkScenario(config['save_path'])
      .then(mainMenu)
  }

  if (choice === choices[4]) {
    console.log(`Путь: ${config['save_path']}`);
    return mainMenu()
  }

  if (choice === choices[5]) {
    await getSaveFolder(config)
      .then(mainMenu);
  }

  if (choice === choices[5]) {
    console.log(`Путь: ${__dirname}`);
    return mainMenu();
  }

  if (choice === choices[7]) {
    try {
      fs.rmSync('./errors.json');
    } catch (e) {}

    try {
      fs.rmSync('./all-music-data.json');
    } catch (e) {}
  }

  if (choice === choices[choices.length - 1]) {
    process.exit(0);
  }
}

function authorInfo() {
  const getRandomColor = () => {
    const colors = ['cyan', 'green', 'red'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  const data = {
    title: chalk[getRandomColor()]('CLI VK Audio Downloader (aka Скачиватель Музыки ВКонтакте -_-)'),
    author: chalk[getRandomColor()]('   Vladimir Taburkin (Владимир Табуркин)'),
    github: '  https://github.com/VACdotCS',
  }

  console.log(`Название: ${data.title}`);
  console.log(`Автор: ${data.author}`);
  console.log(`Гитхаб: ${data.github}\n`);
}

async function getAccessTokenData() {
  const { data } = await inquirer.prompt([
    {
      type: "input",
      name: "data",
      message: "Введите свой access token (гайд тут): ", // TODO: Вставить ссылку на гайд, как достать токен/id
    },
  ]);

  const tokenJson = JSON.parse(data);

  console.log('Token: ', tokenJson.data);

  global['myConfig']['token'] = tokenJson.data;
  fs.writeFileSync('./config.json', JSON.stringify(global['myConfig']));

  const userId = tokenJson.data.user_id;

  //TODO: добавить нормальную валидацию в сеттеры прямо
  if (!userId || !tokenJson.data) {
    console.log(red("❌ Токен или id введён неверно"));
    process.exit(1);
  }

  vkApiService.setAccessToken(tokenJson.data.access_token);
  vkApiService.setUserId(userId);
}

export async function checkToken() {
  const config = global['myConfig'];
  const token = config['token'];

  const currentTime = Math.floor(Date.now() / 1000);

  if (currentTime >= token.expires) {
    console.log('Токен истёк, нужен новый.');
    await getAccessTokenData();
  }
}

const mainFunc = async () => {
  try {
    authorInfo();
    let config = await new Promise(async (resolve, reject) => {
      fs.readFile('./config.json', (err, data) => {
        if (err) {
          resolve(null);
          return;
        }

        if (!data) {
          resolve(null);
          return;
        }

        resolve(JSON.parse(data.toString()));
      })
    });

    if (config === null) {
      fs.writeFileSync('./config.json', JSON.stringify({}));
      config = {};
    }

    global['myConfig'] = config;

    if (!config['token']) {
      await getAccessTokenData();
    }

    await checkToken();

    if (!config['save_path']) {
      await getSaveFolder(config);
    }

    await mainMenu()
  } catch (e) {
    console.log(red("❌ Что-то пошло не так"));

    if (e.message.includes('access_token has expired')) {
      await getAccessTokenData();
      return mainFunc();
    }
    //console.log(e);
  }
}

program.action(mainFunc);

process.on("SIGINT", () => {
  // TODO: clear savePath folder from temp files
  console.log(red("\n🛑 Вы нажали CTRL+C, тем самым закрыв программу"));
  controller.abort();
  process.exit(0);
});

program.parse(process.argv);