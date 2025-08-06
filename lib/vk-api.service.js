import axios from 'axios';

export const controller = new AbortController();

class VkApiService {
  #userData = {
    user_id: 192026375,
    access_token: 'vk1.a.khxKBu9r9ePz4k19zmbfBEe3ivjfhLodm0M_9vU0to_3X1oWcaGB0x4fq32lW0X1w-f9hCeSRIMnitMJ5WMSg2UiKTc_cMjNf2I6ISDz0S00bnVlEBEeskoLPnoBQelCsCGLcPKppxnKBziErE-B7Hy9twrCYEJ57mAJYeQ_iLWSYOCHePJcWyA-Wf2EbRYxQ5v9k2RJG2i5tdFrx4t6kA'
  };
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

      if (!list || audioListResponse.status !== 200) {
        throw new Error(audioListResponse?.data?.error.error_msg);
      }

      console.log(`√ Треков найдено: ${list?.length}`);

      return list;
    } catch (error) {
      console.error(`\n${this.constructor.name}.getAudiosList: ${error}`);
      throw error;
    }
  }

  async getPlaylists() {
    const link = `https://api.vk.com/method/audio.getPlaylists?owner_id=${this.#userData.user_id}&access_token=${this.#userData.access_token}&v=5.131&count=200`;

    try {
      const audioListResponse = await this.#axiosInstance.get(link);
      const list = audioListResponse?.data?.response?.items;

      if (!list || audioListResponse.status !== 200) {
        throw new Error(audioListResponse?.data?.error.error_msg);
      }

      return list;
    } catch (error) {
      console.error(`\n${this.constructor.name}.getPlaylists: ${error}`);
      throw error;
    }
  }

  async getTracksOfUserPlaylist(playlistId) {
    const link = `https://api.vk.com/method/audio.get?owner_id=${this.#userData.user_id}&access_token=${this.#userData.access_token}&v=5.131&playlist_id=${playlistId}`;

    try {
      const audioListResponse = await this.#axiosInstance.get(link);
      const list = audioListResponse?.data?.response?.items;

      if (!list || audioListResponse.status !== 200) {
        throw new Error(audioListResponse?.data?.error.error_msg);
      }

      return list;
    } catch (error) {
      console.error(`\n${this.constructor.name}.getTracksOfUserPlaylist: ${error}`);
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
        throw new Error(audioListResponse?.data?.error.error_msg);
      }

      return list;
    } catch (error) {
      console.error(`\n${this.constructor.name}.getTracksOfPlaylistByLink: ${error}`);
      throw error;
    }
  }

  async getAudioByLink(link) {
    const { owner_id, audio_id }  = this.getAudioDataFromLink(link);

    const urls = [
      `https://api.vk.com/method/audio.getById?audios=${owner_id}_${audio_id}&access_token=${this.#userData.access_token}&v=5.131`,
      `https://api.vk.com/method/audio.getById?audios=-${owner_id}_${audio_id}&access_token=${this.#userData.access_token}&v=5.131`
    ]

    for (const url of urls) {
      try {
        const audioListResponse = await this.#axiosInstance.get(url);
        const list = audioListResponse?.data?.response;

        if ((!list || audioListResponse.status !== 200) && !(audioListResponse?.data?.error.error_code === 100)) {
          throw new Error(audioListResponse?.data?.error.error_msg);
        }

        if (list && list[0]) {
          return list[0];
        }
      } catch (error) {
        console.error(`\n${this.constructor.name}.getAudioByLink: ${error}`);
        throw error;
      }
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

  getAudioDataFromLink(link) {
    const regex = /audio-?(\d+)_(\d+)/i;
    const matches = link.match(regex);

    return {
      owner_id: matches[1],
      audio_id: matches[2],
    }
  }
}

export const vkApiService = new VkApiService();