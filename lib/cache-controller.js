import fs from "fs";

export class CacheController {
  static init() {
    if (
      fs.readdirSync('./')
        .find((s) => s === 'cache')
    ) {
      return;
    }
    fs.mkdirSync('./cache');
  }

  static add(fileName, content) {
    fs.writeFileSync(`./cache/${fileName}`, content);
  }

  static clearCache() {
    try {
      fs.rmSync(`./cache`, { recursive: true });
      fs.rmSync('./errors.json');
    } catch (e) {}
  }

  static clearTempFiles() {
    try {
      const path = global['myConfig']['save_path'];
      const files = fs.readdirSync(path, { recursive: true});

      for (const file of files) {
        if (/temp-.*\.ts/.test(file)) {
          try {
            fs.unlinkSync(path + `/${file}`);
          } catch (e) {} // ignore busy files
        }
      }
    } catch (e) {
      console.error('Не смог почистить временные файлы.')
      console.error(e);
    }
  }

  static outputBlockedTracks() {
    try {
      const tracks = JSON.parse(fs.readFileSync('./errors.json', 'utf8'));

      if (tracks.length === 0) {
        console.log('Не смог найти заблокированные треки в кэше');
        return;
      }

      for (const track of tracks) {
        console.log(`${track.artist} - ${track.title}`);
      }
    } catch (e) {
      console.log('Не смог найти заблокированные треки в кэше')
    }
  }
}