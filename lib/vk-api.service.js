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
        throw new Error(audioListResponse?.response?.errors);
      }

      return list;
    } catch (error) {
      console.error(`${this.constructor.name}.getAudiosList: ${error}`);
      throw error;
    }
  }

  async getPlaylists() {
    const link = `https://api.vk.com/method/audio.getPlaylists?owner_id=${this.#userData.user_id}&access_token=${this.#userData.access_token}&v=5.131&count=200`;

    try {
      const audioListResponse = await this.#axiosInstance.get(link);
      const list = audioListResponse?.data?.response?.items;

      if (!list || audioListResponse.status !== 200) {
        throw new Error(audioListResponse?.response?.errors);
      }

      return list;
    } catch (error) {
      console.error(`${this.constructor.name}.getPlaylistsMetadata: ${error}`);
      throw error;
    }
  }

  async getTracksOfUserPlaylist(playlistId) {
    const link = `https://api.vk.com/method/audio.get?owner_id=${this.#userData.user_id}&access_token=${this.#userData.access_token}&v=5.131&playlist_id=${playlistId}`;

    try {
      const audioListResponse = await this.#axiosInstance.get(link);
      const list = audioListResponse?.data?.response?.items;

      if (!list || audioListResponse.status !== 200) {
        throw new Error(audioListResponse?.response?.errors);
      }

      return list;
    } catch (error) {
      console.error(`${this.constructor.name}.getTracksOfPlaylist: ${error}`);
      throw error;
    }
  }

  async getTracksOfPlaylistByLink(link) {
    const playlistData = this.getPlaylistDataFromLink(link);

    const url = `https://api.vk.com/method/audio.get?owner_id=${playlistData.owner_id}&playlist_id=${playlistData.playlist_id}&access_key=${playlistData.access_key}&access_token=${this.#userData.access_token}&v=5.131&count=200`;

    try {
      const audioListResponse = await this.#axiosInstance.get(url);
      const list = audioListResponse?.data?.response?.items;

      if (!list || audioListResponse.status !== 200) {
        throw new Error(audioListResponse?.response?.errors);
      }

      return list;
    } catch (error) {
      console.error(`${this.constructor.name}.getTracksOfPlaylist: ${error}`);
      throw error;
    }
  }

  setAccessToken(accessToken) {
    this.#userData['access_token'] = accessToken;
  }

  setUserId(userId) {
    this.#userData['user_id'] = userId;
  }


  getPlaylistDataFromLink(link) {
    const regex = /[-]?\d+_\d+_[a-f0-9]+/i;
    const [ownerId, playlistId, accessKey] = link.match(regex)[0].split('_');
    return {
      playlist_id: Number(playlistId),
      owner_id: Number(ownerId),
      access_key: accessKey
    }
  }
}

export const vkApiService = new VkApiService();