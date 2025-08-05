import ffmpeg from "fluent-ffmpeg";
import fs from "fs";

export class FileConverter {
  static tsSegmentsToMP3(inputTsPath, outputMp3Path) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputTsPath)
        .audioCodec('libmp3lame')
        .format('mp3')
        .on('end', () => {
          fs.unlink(inputTsPath, resolve);
        })
        .on('error', reject)
        .save(outputMp3Path);
    });
  }
}