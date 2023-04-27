// import $ from 'jquery';
import { Base64 } from 'js-base64';
import * as lo from 'lodash-es';

import { getHostName } from './utils';

export const transmission = {
  SessionId: null as null | string,
  fullpath: '../rpc',
  on: {
    torrentCountChange: null,
    postError: null as null | ((req: unknown) => void),
  },
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
    await this.getSessionId();
  },

  async execAsync(config?: { method: string; arguments?: any }) {
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
        transmission.on.postError?.(res);
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

  getStatus(callback: (data: unknown) => void) {
    this.exec(
      {
        method: 'session-stats',
      },
      function (data) {
        if (data.result == 'success') {
          if (callback) {
            callback(data.arguments);
          }

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
  async getSession() {
    return await this.execAsync({
      method: 'session-get',
    });
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
      const contents = e.target!.result as string;
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
    if (this.on.torrentCountChange) {
      // @ts-expect-error
      this.on.torrentCountChange();
    }
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
  // 关闭连接？
  closeSession(callback?: (data: unknown) => void) {
    this.exec(
      {
        method: 'session-close',
      },
      function (result) {
        if (callback != null) {
          callback(result);
        }
      },
    );
  },
  torrents: {
    activeTorrentCount: 0,
    actively: null as null | Torrent[],
    addTracker(item: Torrent) {
      var trackerStats = item.trackerStats;
      var trackers: string[] = [];

      item.leecherCount = 0;
      item.seederCount = 0;

      if (trackerStats.length > 0) {
        const warnings: string[] = [];
        for (const trackerInfo of trackerStats) {
          const lastResult = trackerInfo.lastAnnounceResult.toLowerCase();
          const hostName = getHostName(trackerInfo.host);
          const trackerUrl = hostName.split('.');
          if ($.inArray(trackerUrl[0], 'www,tracker,announce'.split(',')) != -1) {
            trackerUrl.shift();
          }

          const name = trackerUrl.join('.');
          const id = 'tracker-' + name.replace(/\./g, '-');
          let tracker = transmission.trackers[id];
          if (!tracker) {
            // @ts-expect-error
            tracker = {
              count: 0,
              torrents: [],
              size: 0,
              connected: true,
              isBT: trackerStats.length > 5,
              name,
              nodeid: id,
              host: trackerInfo.host,
            } as Tracker;
            transmission.trackers[id] = tracker;
          }

          tracker.name = name;
          tracker.nodeid = id;
          tracker.host = trackerInfo.host;

          // 判断当前tracker状态
          if (
            !trackerInfo.lastAnnounceSucceeded &&
            trackerInfo.announceState != transmission._trackerStatus.inactive
          ) {
            warnings.push(trackerInfo.lastAnnounceResult);

            if (lastResult == 'could not connect to tracker') {
              tracker.connected = false;
            }
          }

          if (!tracker.torrents.includes(item)) {
            tracker.torrents.push(item);
            tracker.count++;
            tracker.size += item.totalSize;
          }

          item.leecherCount += trackerInfo.leecherCount;
          item.seederCount += trackerInfo.seederCount;
          if (!trackers.includes(name)) {
            trackers.push(name);
          }
        }

        if (!item.isPrivate) {
          this.btItems.push(item);
        }

        // private tracker, show any warning
        if (item.isPrivate) {
          if (warnings.length) {
            this.warning?.push(item);
          }
        } else if (warnings.length == trackerStats.length) {
          this.warning?.push(item);
        }

        if (item.leecherCount < 0) {
          item.leecherCount = 0;
        }
        if (item.seederCount < 0) {
          item.seederCount = 0;
        }

        item.leecher = `${item.leecherCount} (${item.peersGettingFromUs})`;
        item.seeder = `${item.seederCount} (${item.peersSendingToUs})`;
        item.trackers = trackers.join(';');
      }
    },

    allTorrents(): Torrent[] {
      return Object.values(this.all);
    },

    all: {} as Record<string, Torrent>,
    allInit: false,
    btItems: [] as Torrent[],
    count: 0,
    datas: {} as Record<string, Torrent> | null,
    downloading: null as Torrent[] | null,
    error: null as Torrent[] | null,
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
        torrents: Torrent[];
        size: number;
        nodeid: string;
      }
    >,
    getConfig(id: string, callback: (torrents: Torrent[] | null) => void) {
      this.getMoreInfos(this.fields.config, id, callback);
    },
    getErrorIds(ignore: any, needUpdateOnly: boolean) {
      const result = [];
      const nowDate = new Date();
      let now = 0;
      if (needUpdateOnly) {
        now = nowDate.getTime() / 1000;
      }

      for (const item of this.error ?? []) {
        if ($.inArray(item.id, ignore) != -1 && ignore.length > 0) {
          continue;
        }
        if (needUpdateOnly) {
          // 当前时间没有超过“下次更新时间”时，不需要更新
          if (now < item.nextAnnounceTime) {
            continue;
          }
        }

        // 已停止的種子不計算在內
        if (item.status == transmission._status.stopped) {
          continue;
        }

        result.push(item.id);
      }

      for (const item of this.warning ?? []) {
        if ($.inArray(item.id, ignore) != -1 && ignore.length > 0) {
          continue;
        }

        if (needUpdateOnly) {
          // 当前时间没有超过“下次更新时间”时，不需要更新
          if (now < item.nextAnnounceTime) {
            continue;
          }
        }
        result.push(item.id);
      }

      return result;
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

    getMagnetLink(ids: string[], callback: any) {
      let result = '';
      // is single number
      if (!Array.isArray(ids)) {
        ids = [ids];
      }
      if (ids.length == 0) {
        if (callback) {
          callback(result);
        }
        return;
      }
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
          result += t.magnetLink + '\n';
        }
      }

      if (reqList.length == 0) {
        if (callback) {
          callback(result.trim());
        }
        return;
      }

      transmission.exec(
        {
          method: 'torrent-get',
          arguments: {
            fields: ['id', 'magnetLink'],
            ids: reqList,
          },
        },
        function (data) {
          if (data.result == 'success') {
            for (const item of data.arguments.torrents as Array<
              Pick<Torrent, 'id' | 'magnetLink'>
            >) {
              transmission.torrents.all[item.id]!.magnetLink = item.magnetLink;
              result += item.magnetLink + '\n';
            }
            if (callback) {
              callback(result.trim());
            }
          }
        },
      );
    },
    // List of all the torrents that have been acquired
    getMoreInfos(
      fields: string | string[],
      ids: any,
      callback: (torrents: Torrent[] | null) => void,
    ) {
      transmission.exec(
        {
          method: 'torrent-get',
          arguments: {
            fields: typeof fields === 'string' ? fields.split(',') : fields,
            ids,
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
    // The recently removed seed
    getAllIDs(
      callback: null | ((data: Torrent[] | null) => void),
      ids: string[] | undefined,
      moreFields?: Array<keyof Torrent>,
    ) {
      let tmp = this.fields.base;
      if (this.loadSimpleInfo && this.all) {
        tmp = this.fields.status;
      }

      let fields = tmp;
      if (Array.isArray(moreFields)) {
        fields = Array.from(new Set([...fields, ...moreFields]));
      }
      const args: Record<string, any> = {
        fields,
      };

      this.isRecentlyActive = false;
      // If it has been acquired
      if (Object.keys(this.all).length && ids == undefined) {
        args.ids = 'recently-active';
        this.isRecentlyActive = true;
      } else if (ids) {
        args.ids = ids;
      }

      transmission.exec(
        {
          method: 'torrent-get',
          arguments: args,
        },
        function (data) {
          if (data.result == 'success') {
            transmission.torrents.newIds.length = 0;
            transmission.torrents.loadSimpleInfo = true;
            transmission.torrents.recently = data.arguments.torrents;
            transmission.torrents.removed = data.arguments.removed;
            transmission.torrents.splitID();
            if (callback) {
              callback(data.arguments.torrents);
            }
          } else {
            transmission.torrents.datas = null;
            if (callback) {
              callback(null);
            }
          }
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
    puased: null as Torrent[] | null,
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

    splitID() {
      // Downloading
      this.downloading = [];
      // Paused
      this.puased = [];
      // Active lately
      this.actively = [];
      // With Errors
      this.error = [];
      // With Warnings
      this.warning = [];
      this.btItems = [];
      // All download directories used by current torrents
      if (transmission.downloadDirs == undefined) {
        transmission.downloadDirs = [];
      }

      const _Status = transmission._status;
      this.status = {};
      transmission.trackers = {};
      this.totalSize = 0;
      this.folders = {};
      this.count = 0;

      // Merge two numbers
      for (const item of this.recently ?? []) {
        // @ts-expect-error
        this.datas[item.id] = item;
      }

      const removed: number[] = [];

      for (const item of this.removed ?? []) {
        removed.push(item);
      }

      // Torrents are classified
      for (var index in this.datas) {
        var item = this.datas?.[index];
        if (!item) {
          return;
        }
        if ($.inArray(item.id, removed) != -1 && removed.length > 0) {
          if (this.all[item.id]) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete this.all[item.id];
          }
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete this.datas[index];

          continue;
        }
        // If the current torrent is being acquired and there is no such torrent in the previous torrent list, that is, the new torrent needs to be reloaded with the basic information
        if (this.isRecentlyActive && !this.all[item.id]) {
          // @ts-expect-error
          this.newIds.push(item.id);
        }
        item = $.extend(this.all[item.id], item);
        // 没有活动数据时，将分享率标记为 -1
        if (item.uploadedEver == 0 && item.downloadedEver == 0) {
          item.uploadRatio = -1;
        }
        // 转为数值
        // @ts-expect-error
        item.uploadRatio = parseFloat(item.uploadRatio);
        // @ts-expect-error
        item.infoIsLoading = false;
        // @ts-expect-error
        let type = this.status[item.status];
        this.addTracker(item);
        if (!type) {
          // @ts-expect-error
          this.status[item.status] = [];
          // @ts-expect-error
          type = this.status[item.status];
        }

        // Total size
        this.totalSize += item.totalSize;

        // Time left
        if (item.rateDownload > 0 && item.leftUntilDone > 0) {
          item.remainingTime = Math.floor(item.leftUntilDone / item.rateDownload);
        } else if (item.rateDownload == 0 && item.leftUntilDone == 0 && item.totalSize != 0) {
          item.remainingTime = 0;
        } else {
          // ~100 years
          item.remainingTime = 3153600000;
        }

        type.push(item);
        // The seed for which the error occurred
        if (item.error != 0) {
          this.error.push(item);
        }

        // There is currently a number of seeds
        if (item.rateUpload > 0 || item.rateDownload > 0) {
          this.actively.push(item);
        }

        switch (item.status) {
          case _Status.stopped:
            this.puased.push(item);
            break;

          case _Status.download:
            this.downloading.push(item);
            break;
        }

        this.all[item.id] = item;

        // Set the directory
        if (!transmission.downloadDirs.includes(item.downloadDir)) {
          transmission.downloadDirs.push(item.downloadDir);
        }

        if (transmission.options.getFolders) {
          if (item.downloadDir) {
            // 统一使用 / 来分隔目录
            const folder = item.downloadDir.replace(/\\/g, '/').split('/');
            let folderkey = 'folders-';
            for (const text of folder) {
              const key = Base64.encode(text);
              // 去除特殊字符
              folderkey += key.replace(/[+|\/|=]/g, '0');
              let node = this.folders[folderkey];
              if (!node) {
                node = {
                  count: 0,
                  torrents: [],
                  size: 0,
                  nodeid: folderkey,
                };
              }
              node.torrents.push(item);
              node.count++;
              node.size += item.totalSize;
              this.folders[folderkey] = node;
            }
          }
        }

        this.count++;
      }
      transmission.downloadDirs = transmission.downloadDirs.sort();

      // If there a need to acquire new seeds
      if (this.newIds.length > 0) {
        this.getAllIDs(null, this.newIds);
      }
    },
    // 获取错误/警告的ID列表

    status: {},
    // 查找并替換 Tracker

    totalSize: 0,

    // 获取磁力链接
    warning: null as Torrent[] | null,
  },
};

export interface Tracker {
  announce: string;
  host: string;
  nodeid: string;
  name: string;
  count: number;
  torrents: Torrent[];
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
  lastAnnounceResult: string;
}

export interface Torrent {
  isPrivate: boolean;
  id: number;
  name: string;
  hashString: string;
  totalSize: number;
  peersGettingFromUs: string;
  peersSendingToUs: string;
  leecher: string;
  seeder: string;
  trackers: string;
  warning: string;
  seederCount: number;
  leecherCount: number;
  status: number;
  trackerStats: TrackerStat[];
  nextAnnounceTime: number;
  downloadDir: string;
  remainingTime: number;
  magnetLink: string;
  rateDownload: number;
  leftUntilDone: number;
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
  error: unknown;
  errorString: string;
  doneDate: number;
  addedDate: number;
  queuePosition: number;
  activityDate: number;
}

export type Transmission = typeof transmission;
