import inquirer from "inquirer";
import fs from "node:fs";
import {vkApiService} from "../../lib/vk-api.service.js";

export async function getUnlimitedTokenScenario(config) {
  console.log('Откройте ссылку: https://oauth.vk.com/authorize?client_id=6463690&scope=1073737727&redirect_uri=https://oauth.vk.com/blank.html&display=page&response_type=token&revoke=1')
  console.log('Разрешите доступ. \nИз выданных прав используются только аудиозаписи. \nИсходный код программы открыт.');
  console.log('О способе узнал тут: https://vkhost.github.io/');

  const { tokenLink } = await inquirer.prompt([
    {
      type: 'input',
      name: 'tokenLink',
      message: "Вставьте данные из адресной строки (из выданных прав используются только аудиозаписи: ",
    }
  ])

  const res = {}

  // Parse link
  tokenLink
    .split('#')[1]
    .split('&')
    .map(item => {
      const [key, value] = item.split('=');
      res[key] = value;
      delete res['expires_in'];
    })

  global['myConfig']['token'] = res;
  fs.writeFileSync('./config.json', JSON.stringify(global['myConfig']));

  config = global['myConfig'];

  vkApiService.setUserId(res.user_id);
  vkApiService.setAccessToken(res.access_token);

  return config;
}