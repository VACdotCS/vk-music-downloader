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

program.action(async () => {
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

    const { musicLink } = await inquirer.prompt([
      {
        type: "input",
        name: "musicLink",
        message: "Введите свой ВК id (гайд тут): ", // TODO: Вставить ссылку на гайд, как достать токен/id
      },
    ]);

    const userId = parseInt(musicLink.split('audios')[1]);

    const { accessToken } = await inquirer.prompt([
      {
        type: "input",
        name: "accessToken",
        message: "Введите свой access token (гайд тут): ", // TODO: Вставить ссылку на гайд, как достать токен/id
      },
    ]);

    console.log(config);

    if (!config['save_path']) {
      await getSaveFolder(config);
    }

    //TODO: добавить нормальную валидацию в сеттеры прямо
    if (!userId || !accessToken) {
      console.log(red("❌ Токен или id введён неверно"));
      process.exit(1);
    }

    vkApiService.setAccessToken(accessToken);
    vkApiService.setUserId(userId);

    const choices = [
      "Скачать все треки из основного плейлиста",
      "Скачать все плейлисты",
      "Скачать трек по ссылке",
      "Скачать плейлист по ссылке",
      "Скачать плейлист друга",
      "Показать путь для скачивания",
      "Изменить путь для скачивания",
      "Вывести заблокированные в регионе треки",
      "Очистить весь кэш (удалит всё, кроме пути сохранения треков)"
    ];

    const { choice } = await inquirer.prompt([
      {
        type: "list",
        name: "choice",
        message: "Выберите действие",
        choices
      },
    ]);

    if (choice === choices[0]) {
      await getAllAudioScenario(config['save_path']);
    }

    if (choice === choices[5]) {
      await getSaveFolder(config);
    }
  } catch (e) {
    console.log(e);
    console.log(red("❌ Что-то пошло не так"));
  }
});

process.on("SIGINT", () => {
  console.log(red("\n🛑 Вы нажали CTRL+C, тем самым закрыв программу"));
  controller.abort();
  process.exit(0);
});

program.parse(process.argv);