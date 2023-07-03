import { EventEmitter } from 'eventemitter3';
import * as lo from 'lodash-es';
import PQueue from 'p-queue';

import { normalizePath } from './utils';

const queue = new PQueue({ concurrency: 1, autoStart: true });

interface TransmissionEvents {
  error: (err: unknown) => void;
  loaded: () => void;
  torrentCountChange: () => void;
}

export const transmission = {
  SessionId: null as null | string,
  fullpath: '../rpc',
  event: new EventEmitter<TransmissionEvents, never>(),
  // 种子状态
  _status: {
    stopped: 0,
    checkwait: 1,
    check: 2,
    downloadwait: 3,
    download: 4,
    seedwait: 5,
    seed: 6,
    // 自定义状态
    actively: 101,
  },
  // TrackerStats' announceState
  _trackerStatus: {
    inactive: 0,
    waiting: 1,
    queued: 2,
    active: 3,
  },
  options: {
    getFolders: true,
    getTarckers: true,
  },
  headers: {} as Record<string, string>,
  trackers: {} as Record<string, Tracker>,
  // The list of directories that currently exist
  downloadDirs: [] as string[],

  async getSessionId() {
    await this.execAsync();
  },

  async init() {
    console.debug('transmission.init');
    await this.getSessionId();
  },

  async execAsync(config?: { method: string; arguments?: any }) {
    return await queue.add(() => this._execAsync(config));
  },

  async _execAsync(config?: { method: string; arguments?: any }) {
    const data = lo.merge(
      {
        method: '',
        arguments: {},
        tag: '',
      },
      config,
    );

    for (let i = 0; i < 3; i++) {
      const res = await fetch(this.fullpath, {
        method: 'post',
        headers: {
          ...this.headers,
          'X-Transmission-Session-Id': this.SessionId ?? '',
          'content-type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (res.status === 409) {
        this.SessionId = res.headers.get('X-Transmission-Session-Id');
        if (this.SessionId === null) {
          throw new Error('failed to get X-Transmission-Session-Id');
        }
        continue;
      } else if (res.status >= 400) {
        transmission.event.emit(
          'error',
          new Error(`unexpected error code: ${res.status}\n${await res.text()}`),
        );
      }

      return await res.json();
    }

    throw new Error('failed to complete request');
  },

  exec(config: { method: string; arguments?: any }, callback: (data: any, tags?: any) => void) {
    this.execAsync(config).then(callback, (err) => {
      console.error('failed to connect transmission', err);
    });
  },

  async exec2(config: { method: string; arguments?: any }) {
    const data = await this.execAsync(config);
    if (data.result !== 'success') {
      throw new Error(`Failed to exec command ${config.method}: ${JSON.stringify(data)}`);
    }

    return data.arguments;
  },

  getStatus(callback: (data: unknown) => void) {
    this.exec(
      {
        method: 'session-stats',
      },
      function (data) {
        if (data.result === 'success') {
          if (callback) {
            callback(data.arguments);
          }

          transmission.event.emit('loaded');

          if (
            transmission.torrents.count != data.arguments.torrentCount ||
            transmission.torrents.activeTorrentCount != data.arguments.activeTorrentCount ||
            transmission.torrents.pausedTorrentCount != data.arguments.pausedTorrentCount
          ) {
            // Current total number of torrents
            transmission.torrents.count = data.arguments.torrentCount;
            transmission.torrents.activeTorrentCount = data.arguments.activeTorrentCount;
            transmission.torrents.pausedTorrentCount = data.arguments.pausedTorrentCount;
            transmission._onTorrentCountChange();
          }
        }
      },
    );
  },
  getSession(callback?: (data: unknown) => void) {
    this.exec(
      {
        method: 'session-get',
      },
      function (data) {
        if (data.result == 'success') {
          if (callback != null) {
            callback(data.arguments);
          }
        }
      },
    );
  },

  // 添加种子
  addTorrentFromUrl(
    url: string,
    savepath: string,
    autostart: boolean,
    callback?: (data: unknown) => void,
  ) {
    // 磁性连接（代码来自原版WEBUI）
    if (url.match(/^[0-9a-f]{40}$/i) != null) {
      url = 'magnet:?xt=urn:btih:' + url;
    }
    const options = {
      method: 'torrent-add',
      arguments: {
        filename: url,
        paused: !autostart,
      } as Record<string, any>,
    };

    if (savepath) {
      options.arguments['download-dir'] = savepath;
    }
    this.exec(options, function (data) {
      switch (data.result) {
        // 添加成功
        case 'success':
          if (callback != null) {
            if (data.arguments['torrent-added']) {
              callback(data.arguments['torrent-added']);
            }
            // 重复的种子
            else if (data.arguments['torrent-duplicate']) {
              callback({
                status: 'duplicate',
                torrent: data.arguments['torrent-duplicate'],
              });
            }
          }
          break;

        // 重复的种子
        case 'duplicate torrent':
        default:
          if (callback != null) {
            callback(data.result);
          }
          break;
      }
    });
  },
  // 从文件内容增加种子
  addTorrentFromFile(
    file: Blob,
    savePath: string,
    paused: boolean,
    callback: (data: any, fileCount?: number) => void,
    filecount: number,
  ) {
    const fileReader = new FileReader();

    fileReader.onload = function (e) {
      const contents = e.target?.result as string;
      const key = 'base64,';
      const index = contents.indexOf(key);
      if (index == -1) {
        return;
      }
      const metainfo = contents.slice(index + key.length);

      transmission.exec(
        {
          method: 'torrent-add',
          arguments: {
            metainfo,
            'download-dir': savePath,
            paused,
          },
        },
        function (data) {
          switch (data.result) {
            // 添加成功
            case 'success':
              if (callback) {
                if (data.arguments['torrent-added'] != null) {
                  callback(data.arguments['torrent-added'], filecount);
                } else if (data.arguments['torrent-duplicate'] != null) {
                  callback(
                    {
                      status: 'duplicate',
                      torrent: data.arguments['torrent-duplicate'],
                    },
                    filecount,
                  );
                } else {
                  callback('error');
                }
              }
              break;
            // 重复的种子
            case 'duplicate torrent':
              if (callback) {
                callback('duplicate');
              }
              break;
          }
        },
      );
    };
    fileReader.readAsDataURL(file);
  },
  _onTorrentCountChange() {
    this.torrents.loadSimpleInfo = false;
    this.event.emit('torrentCountChange');
  },
  // 删除种子
  removeTorrent(ids: string[], removeData: boolean, callback?: (data: any) => void) {
    this.exec(
      {
        method: 'torrent-remove',
        arguments: {
          ids,
          'delete-local-data': removeData,
        },
      },
      function (data) {
        if (callback != null) {
          callback(data.result);
        }
      },
    );
  },
  // 獲取指定目錄的大小
  getFreeSpace(path: string, callback?: (data: any) => void) {
    this.exec(
      {
        method: 'free-space',
        arguments: {
          path,
        },
      },
      function (result) {
        if (callback != null) {
          callback(result);
        }
      },
    );
  },
  // 更新黑名單
  updateBlocklist(callback?: (data: any) => void) {
    this.exec(
      {
        method: 'blocklist-update',
      },
      function (data) {
        if (callback != null) {
          callback(data.result);
        }
      },
    );
  },
  // 重命名指定的种子文件/目录名称
  // torrentId 		只能指定一个
  // oldpath 			原文件路径或目录，如：opencd/info.txt 或 opencd/cd1
  // newname			新的文件或目录名，如：into1.txt 或 disc1
  renameTorrent(
    torrentId: string,
    oldpath: string,
    newname: string,
    callback?: (data: unknown) => void,
  ) {
    const torrent = this.torrents.all?.[torrentId];
    if (!torrent) {
      return false;
    }

    this.exec(
      {
        method: 'torrent-rename-path',
        arguments: {
          ids: [torrentId],
          path: oldpath || torrent.name,
          name: newname,
        },
      },
      function (data) {
        if (callback != null) {
          callback(data);
        }
      },
    );
  },

  torrents: {
    activeTorrentCount: 0,
    actively: null as null | ProcessedTorrent[],

    all: {} as Record<string, ProcessedTorrent>,
    btItems: [] as ProcessedTorrent[],
    count: 0,
    datas: {} as Record<string, ProcessedTorrent> | null,
    downloading: null as ProcessedTorrent[] | null,
    error: null as ProcessedTorrent[] | null,
    fields: {
      base: [
        'id',
        'name',
        'status',
        'hashString',
        'totalSize',
        'percentDone',
        'addedDate',
        'trackerStats',
        'leftUntilDone',
        'rateDownload',
        'rateUpload',
        'recheckProgress',
        'rateDownload',
        'rateUpload',
        'peersGettingFromUs',
        'peersSendingToUs',
        'uploadRatio',
        'uploadedEver',
        'downloadedEver',
        'downloadDir',
        'error',
        'errorString',
        'doneDate',
        'queuePosition',
        'activityDate',
        'labels',
        'isPrivate',
      ] satisfies Array<keyof Torrent> as Array<keyof Torrent>,
      status: [
        'id',
        'name',
        'status',
        'totalSize',
        'trackerStats',
        'leftUntilDone',
        'rateDownload',
        'rateDownload',
        'peersGettingFromUs',
        'peersSendingToUs',
        'uploadRatio',
        'rateUpload',
        'percentDone',
        'recheckProgress',
        'rateUpload',
        'uploadedEver',
        'downloadedEver',
        'error',
        'errorString',
        'doneDate',
        'queuePosition',
        'activityDate',
      ] satisfies Array<keyof Torrent> as Array<keyof Torrent>,
      config: [
        'id',
        'name',
        'downloadLimit',
        'downloadLimited',
        'peer-limit',
        'seedIdleLimit',
        'seedIdleMode',
        'seedRatioLimit',
        'seedRatioMode',
        'uploadLimit',
        'uploadLimited',
      ] satisfies Array<keyof Torrent> as Array<keyof Torrent>,
    },
    folders: {} as Record<
      string,
      {
        count: number;
        torrents: ProcessedTorrent[];
        size: number;
        nodeid: string;
      }
    >,
    getConfig(id: string, callback: (torrents: ProcessedTorrent[] | null) => void) {
      this.getMoreInfos(this.fields.config, id).then(callback, () => {
        callback(null);
      });
    },

    getFiles(id: any, callback: any) {
      transmission.exec(
        {
          method: 'torrent-get',
          arguments: {
            fields: 'files,fileStats'.split(','),
            ids: id,
          },
        },
        function (data) {
          if (data.result == 'success') {
            if (callback) {
              callback(data.arguments.torrents);
            }
          } else if (callback) {
            callback(null);
          }
        },
      );
    },

    async getMagnetLink(ids: number[]): Promise<string> {
      if (ids.length == 0) {
        return '';
      }

      const result: string[] = [];

      // 跳过己获取的
      const reqList = [];
      for (const id of ids) {
        const t = this.all?.[id];
        if (!t) {
          continue;
        }
        if (!t.magnetLink) {
          reqList.push(id);
        } else {
          result.push(t.magnetLink);
        }
      }

      if (reqList.length == 0) {
        return result.join('\n');
      }

      const data = await transmission.execAsync({
        method: 'torrent-get',
        arguments: {
          fields: ['id', 'magnetLink'],
          ids: reqList,
        },
      });

      if (data.result == 'success') {
        for (const item of data.arguments.torrents as Array<
          Pick<ProcessedTorrent, 'id' | 'magnetLink'>
        >) {
          transmission.torrents.all[item.id]!.magnetLink = item.magnetLink;
          result.push(item.magnetLink);
        }
      }

      return result.join('\n');
    },
    // List of all the torrents that have been acquired
    async getMoreInfos(fields: string | readonly string[], ids: any) {
      const data = await transmission.execAsync({
        method: 'torrent-get',
        arguments: {
          fields: typeof fields === 'string' ? fields.split(',') : fields,
          ids,
        },
      });
      if (data.result == 'success') {
        return data.arguments.torrents;
      }
    },

    // The list of recently acquired torrents
    getPeers(ids: string[]) {
      transmission.exec(
        {
          method: 'torrent-get',
          arguments: {
            fields: 'peers,peersFrom'.split(','),
            ids,
          },
        },
        function (data) {
          console.log('data:', data);
        },
      );
    },

    // Whether the torrents are being changed
    isRecentlyActive: false,
    // New torrents
    loadSimpleInfo: false,
    newIds: [] as string[],
    pausedTorrentCount: 0,
    // The IDs are sorted according to the torrent status
    puased: null as ProcessedTorrent[] | null,
    recently: null,
    // 获取下载者和做种者数量测试

    removed: null,
    // 获取更多信息

    search(key: any, source: any) {
      if (!key) {
        return null;
      }

      if (!source) {
        source = this.all;
      }

      const arrReturn: any = [];
      $.each(source, function (item, i) {
        if (source[item].name.toLowerCase().indexOf(key.toLowerCase()) != -1) {
          arrReturn.push(source[item]);
        }
      });

      this.searchResult = arrReturn;

      return arrReturn;
    },
    // 从当前已获取的种子列表中搜索指定关键的种子

    searchAndReplaceTrackers(
      oldTracker: string,
      newTracker: string,
      callback: (result: null, count?: number) => void,
    ) {
      /* eslint-disable */
      if (!oldTracker || !newTracker) {
        return;
      }
      const result: any = {};
      let count = 0;
      for (const item of Object.values(this.all ?? {})) {
        const trackerStats = item.trackerStats;
        for (const n in trackerStats) {
          const tracker = trackerStats[n];
          if (tracker!.announce == oldTracker) {
            if (!result[n]) {
              result[n] = {
                ids: [],
                tracker: newTracker,
              };
            }
            result[n].ids.push(item.id);
            count++;
          }
        }
      }

      if (count == 0) {
        if (callback) {
          callback(null, 0);
        }
      }
      for (var index in result) {
        transmission.exec(
          {
            method: 'torrent-set',
            arguments: {
              ids: result[index].ids,
              trackerReplace: [parseInt(index), result[index].tracker],
            },
          },
          function (data, tags) {
            if (data.result == 'success') {
              if (callback) {
                callback(tags, count);
              }
            } else {
              if (callback) {
                callback(null);
              }
            }
          },
        );
      }
      /* eslint-enable */
    },
    // 获取指定种子的文件列表
    searchResult: null,
    // 获取指定种子的设置信息

    status: {},

    totalSize: 0,

    warning: null as ProcessedTorrent[] | null,
  },

  async fetchALl(): Promise<{ torrents: ProcessedTorrent[] }> {
    const { torrents } = (await this.exec2({
      method: 'torrent-get',
      arguments: {
        fields: this.torrents.fields.base,
      },
    })) as { torrents: Torrent[] };

    return {
      torrents: torrents.map((t) => processTorrent(t)),
    };
  },

  async fetchDelta(): Promise<{ torrents: ProcessedTorrent[]; removed: number[] }> {
    const { removed, torrents } = (await this.exec2({
      method: 'torrent-get',
      arguments: {
        ids: 'recently-active',
        fields: this.torrents.fields.base,
      },
    })) as { torrents: Torrent[]; removed: number[] };

    return {
      removed,
      torrents: torrents.map((t) => processTorrent(t)),
    };
  },
};

function processTorrent(t: Torrent): ProcessedTorrent {
  let warning;
  if (t.isPrivate) {
    const tr = t.trackerStats.find((x) => !x.lastAnnounceSucceeded);
    if (tr) {
      warning = `${tr.host}: ${tr.lastAnnounceResult}`;
    }
  }

  return {
    ...t,
    seederCount: `${t.trackerStats.reduce((pre, cur) => pre + cur.seederCount, 0)} | ${
      t.peersSendingToUs
    }`,
    leecherCount: `${t.trackerStats.reduce((pre, cur) => pre + cur.leecherCount, 0)} | ${
      t.peersGettingFromUs
    }`,
    warning,
    normalizedPath: normalizePath(t.downloadDir),
  };
}

export interface Tracker {
  announce: string;
  host: string;
  nodeid: string;
  name: string;
  count: number;
  torrents: ProcessedTorrent[];
  size: number;
  connected: boolean;
  isBT: boolean;
}

export interface TrackerStat {
  nextAnnounceTime: number;
  announce: string;
  seederCount: number;
  leecherCount: number;
  announceState: number;
  lastAnnounceSucceeded: boolean;
  host: string;
  sitename?: string;
  lastAnnounceResult: string;
}

export interface Torrent {
  labels: string[];
  hashString: string;
  isPrivate: boolean;
  addedDate: number;
  peersGettingFromUs: string;
  peersSendingToUs: string;
  leecher: string;
  seeder: string;
  id: number;
  name: string;
  status: TorrentStatus;
  trackerStats: TrackerStat[];
  nextAnnounceTime: number;
  downloadDir: string;
  remainingTime: number;
  magnetLink: string;
  rateDownload: number;
  leftUntilDone: number;
  totalSize: number;
  uploadRatio: number;
  downloadLimit: number;
  downloadLimited: number;
  'peer-limit': number;
  seedIdleLimit: number;
  seedIdleMode: number;
  seedRatioLimit: number;
  seedRatioMode: number;
  uploadLimit: number;
  uploadLimited: boolean;
  percentDone: number;
  recheckProgress: number;
  rateUpload: number;
  uploadedEver: number;
  downloadedEver: number;
  error: number;
  errorString: string;
  doneDate: number;
  queuePosition: number;
  activityDate: number;
}

export interface ProcessedTorrent {
  normalizedPath: string;
  warning?: string;

  labels: string[];
  hashString: string;
  isPrivate: boolean;
  addedDate: number;
  peersGettingFromUs: string;
  peersSendingToUs: string;
  leecher: string;
  seeder: string;
  seederCount: string;
  leecherCount: string;
  id: number;
  name: string;
  status: TorrentStatus;
  trackerStats: TrackerStat[];
  nextAnnounceTime: number;
  downloadDir: string;
  remainingTime: number;
  magnetLink: string;
  rateDownload: number;
  leftUntilDone: number;
  totalSize: number;
  uploadRatio: number;
  downloadLimit: number;
  downloadLimited: number;
  'peer-limit': number;
  seedIdleLimit: number;
  seedIdleMode: number;
  seedRatioLimit: number;
  seedRatioMode: number;
  uploadLimit: number;
  uploadLimited: boolean;
  percentDone: number;
  recheckProgress: number;
  rateUpload: number;
  uploadedEver: number;
  downloadedEver: number;
  error: number;
  errorString: string;
  doneDate: number;
  queuePosition: number;
  activityDate: number;
}

export type Transmission = typeof transmission;

transmission.event.on('error', (err: unknown) => {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  console.error(`transmission error
: ${err}
  `);
});

export enum TorrentStatus {
  stopped = 0,
  checkwait = 1,
  check = 2,
  downloadwait = 3,
  download = 4,
  seedwait = 5,
  seed = 6,
}
