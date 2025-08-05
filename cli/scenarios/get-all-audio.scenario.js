import fs from "fs";
import {vkApiService} from "../../lib/vk-api.service.js";
import ora from "ora";
import {downloadBatchOfTracks} from "../../lib/download.utils.js";

export async function getAllAudioScenario(savePath) {
  const spinner = ora('Скачиваю список ваших треков').start();
  const audioList = await vkApiService.getAudiosList().then((list) => list.reverse());
  spinner.succeed('Список треков получен. Запускаю скачивание.\n');

  const toDownload = [];
  fs.writeFileSync('all-music-data.json', JSON.stringify(audioList));

  const downloadedFilesMeta = fs.readdirSync(savePath);

  let namingIndex = 1;

  for (const audio of audioList) {
    if (downloadedFilesMeta.find((s) => s.includes(`${audio.artist} - ${audio.title}`))) {
      namingIndex++;
    } else {
      toDownload.push(audio);
    }
  }

  await downloadBatchOfTracks(toDownload, savePath, namingIndex);
}