import axios from 'axios';

export const controller = new AbortController();

class VkApiService {
  #userData = {};
  #axiosInstance;

  constructor() {
    this.#axiosInstance = axios.create({
      signal: controller.signal,
    });
  }

  async getAudiosList() {
    const link = `https://api.vk.com/method/audio.get?owner_id=${this.#userData.user_id}&access_token=${this.#userData.access_token}&v=5.131&count=6000`;

    try {
      const audioListResponse = await this.#axiosInstance.get(link);
      const list = audioListResponse?.data?.response?.items;

      console.log(`√ Треков найдено: ${list.length}`);

      if (!list || audioListResponse.status !== 200) {
        throw new Error(audioListResponse?.errors);
      }

      return list;
    } catch (error) {
      console.error(`${this.constructor.name}.getAudiosList: ${error}`);
      throw error;
    }
  }

  async getPlaylists() {
    const link = `https://api.vk.com/method/audio.getPlaylists?owner_id=${this.#userData.user_id}&access_token=${this.#userData.access_token}&v=5.131&count=6000`;

    try {
      const audioListResponse = await this.#axiosInstance.get(link);
      const list = audioListResponse?.data?.response?.items;

      console.log(`Нашло ${list.length} аудио файл/ов`);

      if (!list || audioListResponse.status !== 200) {
        throw new Error(audioListResponse?.errors);
      }

      return list;
    } catch (error) {
      console.error(`${this.constructor.name}.getPlaylistsMetadata: ${error}`);
      throw error;
    }
  }

  setAccessToken(accessToken) {
    this.#userData['access_token'] = accessToken;
  }

  setUserId(userId) {
    this.#userData['user_id'] = userId;
  }
}

// Circular deps
export const vkApiService = new VkApiService();