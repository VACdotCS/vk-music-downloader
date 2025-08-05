import inquirer from "inquirer";
import ora from "ora";
import {vkApiService} from "../../lib/vk-api.service.js";
import fs from "fs";
import {catchAudioStreamError, downloadBatchOfTracks, getNormalFileName} from "../../lib/download.utils.js";
import path from "node:path";
import {generateHash} from "random-hash";
import {vkAudioDownloader} from "../../lib/vk-audio-downloader.js";

export async function getTrackByLinkScenario(savePath) {
  const { link } = await inquirer.prompt([
    {
      type: "input",
      name: "link",
      message: "Введите ссылку на трек: ",
    },
  ]);

  const audioData = await vkApiService.getAudioByLink(link);

  const fileName = getNormalFileName(audioData);

  const spinner = ora(`Скачиваю трек: ${fileName}`).start();
  const tempFilePath = path.resolve(`${savePath}/temp-${generateHash({ length: 4 })}.ts`);
  const mp3FilePath = path.resolve(`${savePath}/${fileName}`);

  const downloadTask = () => vkAudioDownloader.processStream(audioData.url, tempFilePath, mp3FilePath)
    .catch((err) => catchAudioStreamError(err, audioData, fileName));

  await downloadTask();
  spinner.succeed(`Трек скачан: ${savePath}/${fileName}`);
}