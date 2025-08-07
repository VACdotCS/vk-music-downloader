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
          fs.unlinkSync(path + `/${file}`);
        }
      }
    } catch (e) {
      console.error('Не смог почистить временные файлы.')
      console.error(e);
    }
  }
}