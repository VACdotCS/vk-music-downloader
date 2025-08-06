import path from "node:path";
import {generateHash} from "random-hash";
import {vkAudioDownloader} from "./vk-audio-downloader.js";
import fs from "fs";
import {Listr} from "listr2";

export const fileNameRegExp = /[\/|.?<>":,]/g;

export function getNormalFileName(audioMeta) {
  return `${audioMeta.artist} - ${audioMeta.title}`.replace(fileNameRegExp, '') + '.mp3'
}

export async function downloadBatchOfTracks(toDownload, savePath, namingIndex = 1) {
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

      const fileName = getNormalFileName(audio);
      const tempFilePath = path.resolve(`${savePath}/temp-${generateHash({ length: 4 })}.ts`);
      const mp3FilePath = path.resolve(`${savePath}/${namingIndex}. ${fileName}`);

      const downloadTask = () => vkAudioDownloader.processStream(audio.url, tempFilePath, mp3FilePath)
        .catch((err) => catchAudioStreamError(err, audio, fileName));

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

export function catchAudioStreamError(err, audioMeta, fileName) {
  const isFileExists = fs.readdirSync('./').find((s) => s.includes('errors.json'));
  const audioBlocked = ` Трек заблокирован в Вашем регионе: ${fileName}`

  if (!isFileExists) {
    fs.writeFileSync('./errors.json', '[]');
  }

  const errors = fs.readFileSync('./errors.json').toJSON();

  if (!errors || !errors.length) {
    fs.writeFileSync('./errors.json', JSON.stringify([audioMeta]));

    if (audioMeta['content_restricted']) {
      throw new Error(audioBlocked);
    }

    throw err;
  }

  errors.push(audioMeta);
  fs.writeFileSync('./errors.json', JSON.stringify(errors));

  if (audioMeta['content_restricted']) {
    throw new Error(audioBlocked);
  }

  throw err;
}