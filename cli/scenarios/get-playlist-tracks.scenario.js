import fs from "fs";
import inquirer from "inquirer";
import {vkApiService} from "../../lib/vk-api.service.js";
import ora from "ora";
import {downloadBatchOfTracks} from "../../lib/download.utils.js";

export async function getPlaylistTracksByLinkScenario(savePath) {
  const { link } = await inquirer.prompt([
    {
      type: "input",
      name: "link",
      message: "Введите ссылку на плейлист: ",
    },
  ]);

  const spinner = ora('Скачиваю список треков плейлиста').start();
  const playListTracks = await vkApiService.getTracksOfPlaylistByLink(link);

  spinner.succeed('Треки найдены.\n');

  const toDownload = [];
  fs.writeFileSync(`${link}-music-data.json`, JSON.stringify(playListTracks));

  const downloadedFilesMeta = fs.readdirSync(savePath);

  let namingIndex = 1;

  for (const audio of playListTracks) {
    if (downloadedFilesMeta.find((s) => s.includes(`${audio.artist} - ${audio.title}`))) {
      namingIndex++;
    } else {
      toDownload.push(audio);
    }
  }

  await downloadBatchOfTracks(toDownload, savePath, namingIndex);
}