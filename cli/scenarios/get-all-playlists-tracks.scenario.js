import fs from "fs";
import {vkApiService} from "../../lib/vk-api.service.js";
import * as path from "node:path";
import ora from "ora";
import {downloadBatchOfTracks} from "../../lib/download.utils.js";

export async function getPlaylistTracksScenario(savePath) {
  const spinner = ora('Скачиваю список ваших плейлистов').start();

  const playlistsList = await vkApiService.getPlaylists().catch((err) => {
    spinner.fail();
    throw err;
  });

  spinner.succeed('Плейлист найдены.\n');

  for (const p of playlistsList) {
    const pDownloadSpinner = ora(`Скачиваю плейлист: ${p.title}`).start();
    const _savePath = path.resolve(`${savePath}/${p.title}`);

    try {
      fs.mkdirSync(_savePath);
    } catch (e) {}

    const playListTracks = await vkApiService.getTracksOfUserPlaylist(p.id).catch((err) => {
      pDownloadSpinner.fail();
      throw err;
    });

    const toDownload = [];
    fs.writeFileSync(`${p.title}-music-data.json`, JSON.stringify(playListTracks));

    const downloadedFilesMeta = fs.readdirSync(_savePath);

    let namingIndex = 1;

    for (const audio of playListTracks) {
      if (downloadedFilesMeta.find((s) => s.includes(`${audio.artist} - ${audio.title}`))) {
        namingIndex++;
      } else {
        toDownload.push(audio);
      }
    }

    await downloadBatchOfTracks(toDownload, savePath, namingIndex);
    pDownloadSpinner.succeed(`Плейлист скачан: ${p.title}`);
  }
}