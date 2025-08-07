import axios from "axios";
import fs from "fs";
import {FileConverter} from "./ffmpeg.utils.js";
import {createDecipheriv} from "crypto";

/**
 * Copyright 2025 Original Vladimir Taburkin.
 * Licensed under the Apache License, Version 2.0.
 * @author Taburkin Vladimir
 */
class VkAudioDownloader {
  async parseM3U8(m3u8Url) {
    const response = await axios.get(m3u8Url);
    const lines = response.data.split('\n');

    const segments = [];
    let currentKey = null;
    let segmentPrefix = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#EXT-X-KEY:')) {
        const method = line.match(/METHOD=([^,]+)/)?.[1];
        const uri = line.match(/URI="([^"]+)"/)?.[1];
        const iv = line.match(/IV=([^,]+)/)?.[1];

        if (!segmentPrefix && uri && method !== 'NONE') {
          segmentPrefix = uri.replace('key.pub?siren=1', '');
        }

        currentKey = method === 'AES-128' ? { method, uri, iv } : null;
      } else if (line.startsWith('#EXTINF:')) {
        const segmentUrl = lines[++i].trim();
        segments.push({ url: segmentPrefix + segmentUrl, key: currentKey });
      }
    }

    return segments;
  }

  async fetchKey(keyUri) {
    const response = await axios.get(keyUri, { responseType: 'arraybuffer' });
    return response.data;
  }

  async downloadAndDecryptSegment(segmentUrl, key, iv) {
    const response = await axios.get(segmentUrl, { responseType: 'arraybuffer' });
    const encryptedData = response.data;

    if (!key) return encryptedData; // Если сегмент не зашифрован

    const decipher = createDecipheriv('aes-128-cbc', key, iv);

    return Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);
  }

  async processStream(m3u8Url, outputTsFile, fileName, progress = null) {
    const segments = await this.parseM3U8(m3u8Url);
    const writeStream = fs.createWriteStream(outputTsFile);

    for (const [index, segment] of segments.entries()) {
      let key, iv;
      if (segment.key?.method === 'AES-128') {
        key = await this.fetchKey(segment.key.uri);
        iv = segment.key.iv
          ? Buffer.from(segment.key.iv.replace(/^0x/, ''), 'hex')
          : Buffer.alloc(16); // Если IV нет, используем нулевой
      }

      const decryptedData = await this.downloadAndDecryptSegment(segment.url, key, iv);
      progress?.emit('progress', (index / segments.length));
      writeStream.write(decryptedData);
    }

    writeStream.end();
    return new Promise((resolve) => writeStream.on('finish', async () => {
      await FileConverter.tsSegmentsToMP3(outputTsFile, fileName);
      resolve();
    }));
  }
}

export const vkAudioDownloader = new VkAudioDownloader();