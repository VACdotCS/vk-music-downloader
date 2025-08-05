import fs from "fs";
import {generateHash} from "random-hash";
import {Listr} from "listr2";
import inquirer from "inquirer";
import {vkApiService} from "../../lib/vk-api.service.js";
import {vkAudioDownloader} from "../../lib/vk-audio-downloader.js";
import * as path from "node:path";
import ora from "ora";

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

  const batchSize = 10;
  const iterationsCount = Math.floor(toDownload.length / batchSize);

  for (let it = 0; it < iterationsCount; it++) {
    const spinners = [];

    for (let ind = it * batchSize; ind < batchSize * (it + 1); ind++) {
      const audio = toDownload[ind];

      if (!audio) {
        console.log('Breaking: ', ind, batchSize * (it + 1));
        break;
      }

      const fileName = `${audio.artist} - ${audio.title}`
        .replace(/\//g, '&')
        .replace(/\|/g, '')
        .replace(/\./g, '')
        .replace(/\?/g, '') + '.mp3'

      const tempFilePath = path.resolve(`${savePath}/temp-${generateHash({ length: 4 })}.ts`);
      const mp3FilePath = path.resolve(`${savePath}/${namingIndex}. ${fileName}`);

      const downloadTask = () => vkAudioDownloader.processStream(audio.url, tempFilePath, mp3FilePath)
        .catch((err) => {
          const isFileExists = fs.readdirSync('./').find((s) => s.includes('errors.json'));
          const audioBlocked = ` Трек заблокирован в Вашем регионе: ${fileName}`

          if (!isFileExists) {
            fs.writeFileSync('./errors.json', '[]');
          }

          const errors = fs.readFileSync('./errors.json').toJSON();

          if (!errors || !errors.length) {
            fs.writeFileSync('./errors.json', JSON.stringify([audio]));

            if (audio['content_restricted']) {
              throw new Error(audioBlocked);
            }

            throw err;
          }

          errors.push(audio);
          fs.writeFileSync('./errors.json', JSON.stringify(errors));

          if (audio['content_restricted']) {
            throw new Error(audioBlocked);
          }

          throw err;
        })

      const namingIndexCopy = Number(namingIndex);
      spinners.push({
        title: `${namingIndexCopy}. Скачиваю: ${audio.artist} - ${audio.title}`,
        task: async (ctx, task) => {
          await downloadTask();
          task.title = `${namingIndexCopy}. Трек успешно скачан: ${audio.artist} - ${audio.title}.mp3`
        }
      })

      namingIndex++;
    }

    const tasks = new Listr(spinners, {
      concurrent: true,
      exitOnError: false,
    });

    await tasks.run();
  }
}