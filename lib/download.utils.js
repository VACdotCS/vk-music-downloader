import path from "node:path";
import {generateHash} from "random-hash";
import {vkAudioDownloader} from "./vk-audio-downloader.js";
import fs from "fs";
import {Listr} from "listr2";
import EventEmitter from 'node:events';

export const fileNameRegExp = /[\/|.?<>":,«»æ*\\]/g;
const invalidCharsRegex = /[<>:"/\\|?*\x00-\x1F]/g;

export function getNormalFileName(audioMeta) {
  return `${audioMeta.artist} - ${audioMeta.title}`.replace(fileNameRegExp, '') + '.mp3'
}

export function sanitizeFolderName(name) {
  return name
    .replace(invalidCharsRegex, '')  // Заменяем запрещенные символы на подчеркивание
    .replace(/^\./, '')              // Удаляем точку в начале имени
    .replace(/\.$/, '')              // Удаляем точку в конце имени
    .replace(/\s+$/, '');            // Удаляем пробелы в конце
}

export async function downloadBatchOfTracks(toDownload, savePath, namingIndex = 1) {
  const batchSize = 10;
  const iterationsCount = Math.floor(toDownload.length / batchSize);

  let maxTitleLength = -1;
  for (let i = 0; i < toDownload.length; i++) {
    const audio = toDownload[i];
    maxTitleLength = Math.max(maxTitleLength, `${i + 1}. Скачиваю: ${audio.artist} - ${audio.title}`.length)
  }

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
      const progress = new EventEmitter();

      const downloadTask = () =>
        vkAudioDownloader.processStream(audio.url, tempFilePath, mp3FilePath, progress)
                         .catch((err) => catchAudioStreamError(err, audio, fileName));

      const namingIndexCopy = Number(namingIndex);
      const taskTitle = `${namingIndexCopy}. Скачиваю: ${audio.artist} - ${audio.title}`;

      spinners.push({
        title: taskTitle,
        task: async (ctx, task) => {
          const title = `${namingIndexCopy}. Трек успешно скачан: ${audio.artist} - ${audio.title}.mp3`;

          progress.on('progress', progress => {
            task.title = taskTitle + ' ' + renderDownloaderProgress(progress, taskTitle.length, maxTitleLength);
          })

          await downloadTask();
          task.title = title + ' ' + renderDownloaderProgress(1, taskTitle.length, maxTitleLength, Math.abs(title.length - taskTitle.length));
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
  const isFileExists = !!fs.readdirSync('./').find((s) => s.includes('errors.json'));
  const audioBlocked = ` Трек заблокирован в Вашем регионе: ${fileName}`

  if (!isFileExists) {
    fs.writeFileSync('./errors.json', '[]');
  }
  
  const errors = JSON.parse(fs.readFileSync('./errors.json').toString());

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

function renderDownloaderProgress(percentage, currentTitleLength, maxTitleLength, marginCorrection = 0) {
  const copy = Math.floor(percentage * 100);
  const dots = '#'.repeat(copy);
  const spaces = ' '.repeat(100 - copy);

  if (percentage === 1) {
    return ' '.repeat(Math.abs(maxTitleLength - currentTitleLength - marginCorrection)) + `[` + dots + spaces + `] ${copy}/100%`
  }

  return ' '.repeat(Math.abs(maxTitleLength - currentTitleLength)) + `[` + dots + spaces + `] ${copy}/100%`
}