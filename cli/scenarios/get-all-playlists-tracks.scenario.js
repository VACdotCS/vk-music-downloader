import fs from "fs";
import {vkApiService} from "../../lib/vk-api.service.js";
import * as path from "node:path";
import ora from "ora";
import {downloadBatchOfTracks, getNormalFileName, sanitizeFolderName} from "../../lib/download.utils.js";
import {CacheController} from "../../lib/cache-controller.js";

export async function getPlaylistTracksScenario(savePath) {
  const spinner = ora('Скачиваю список ваших плейлистов').start();

  const playlistsList = await vkApiService.getPlaylists().catch((err) => {
    spinner.fail();
    throw err;
  });

  spinner.succeed('Плейлисты найдены');

  const sp2 = ora('Узнаю, что в них за треки').start();

  const playlistsMetadata = [];

  for (const playlist of playlistsList) {
    const playListTracks = await vkApiService.getTracksOfUserPlaylist(playlist.id).catch((err) => {
      sp2.fail();
      throw err;
    });

    playlistsMetadata.push({
      title: playlist.title,
      tracks: playListTracks,
    });
  }

  sp2.succeed('Узнал списки треков\n');


  for (const p of playlistsMetadata) {
    const title = sanitizeFolderName(p.title);

    const pDownloadSpinner = ora(`Скачиваю плейлист: ${p.title}`)
    const _savePath = path.resolve(`${savePath}/${title}`);

    try {
      fs.mkdirSync(_savePath);
    } catch (e) {}

    // Check if playlist downloaded
    const tracksInDir = fs.readdirSync(_savePath);

    let counter = 0;
    for (const trackInDir of tracksInDir) {
      for (const track of p.tracks) {
        const trackFileName = getNormalFileName(track);
        if (trackInDir.includes(trackFileName)) {
          counter++;
        }
      }
    }

    if (counter === p.tracks.length) {
      pDownloadSpinner.succeed(`Плейлист уже скачан: ${p.title}`);
      continue;
    }

    const toDownload = [];

    CacheController.add(`${title}-music-data.json`, JSON.stringify(p.tracks));

    const downloadedFilesMeta = fs.readdirSync(_savePath);

    let namingIndex = 1;

    for (const audio of p.tracks) {
      if (downloadedFilesMeta.find((s) => s.includes(getNormalFileName(audio)))) {
        namingIndex++;
      } else {
        toDownload.push(audio);
      }
    }

    await downloadBatchOfTracks(toDownload, _savePath, namingIndex);
    pDownloadSpinner.succeed(`Плейлист скачан: ${p.title}`);
  }
}