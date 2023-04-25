import $ from 'jquery';
import { Base64 } from 'js-base64';

import { getHostName } from './utils';

export const transmission = {
  SessionId: '',
  isInitialized: false,
  host: '',
  port: '9091',
  path: '/transmission/rpc',
  rpcpath: '../rpc',
  fullpath: '',
  on: {
    torrentCountChange: null,
    postError: null,
  },
  username: '',
  password: '',
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
  islocal: false,
  // The list of directories that currently exist
  downloadDirs: [] as string[],
  // async getSessionId(me: Transmission) {
  //   console.log(this.headers);
  //   const res = await fetch(this.fullpath, {
  //     method: 'POST',
  //     credentials: 'include',
  //     headers: this.headers,
  //   });
  //
  //   if (res.status === 404) {
  //     const SessionId = res.headers.get('X-Transmission-Session-Id');
  //     me.isInitialized = true;
  //     me.SessionId = SessionId;
  //     me.headers['X-Transmission-Session-Id'] = SessionId;
  //   }
  // },
  getSessionId(
    me: {
      isInitialized: boolean;
      SessionId: string | null;
      headers: Record<string, string>;
    },
    callback?: () => void,
  ) {
    void $.ajax({
      type: 'POST',
      url: this.fullpath,
      error: function (request) {
        let SessionId: string | null = '';
        if (
          request.status === 409 &&
          (SessionId = request.getResponseHeader('X-Transmission-Session-Id'))
        ) {
          me.isInitialized = true;
          me.SessionId = SessionId;
          me.headers['X-Transmission-Session-Id'] = SessionId;
          if (callback != null) {
            callback();
          }
        }
      },
      headers: this.headers,
    });
  },
  init(config: unknown, callback: () => void) {
    $.extend(this, config);

    if (this.username && this.password) {
      this.headers.Authorization = 'Basic ' + Base64.encode(this.username + ':' + this.password);
    }

    this.fullpath = this.rpcpath;
    // this.getSessionId(this).finally(callback);
    this.getSessionId(this, callback);
  },

  exec(
    config: { method: string; arguments?: any },
    callback: (data: any, tags?: any) => void,
    tags?: any,
  ) {
    if (!this.isInitialized) {
      return false;
    }
    const data = {
      method: '',
      arguments: {},
      tag: '',
    };

    $.extend(data, config);

    const settings: JQueryAjaxSettings = {
      type: 'POST',
      url: this.fullpath,
      dataType: 'json',
      data: JSON.stringify(data),
      success: function (resultData: unknown, textStatus: unknown) {
        if (callback) {
          callback(resultData, tags);
        }
      },
      error: function (request, event, page) {
        let SessionId: string | null = '';
        if (
          request.status === 409 &&
          (SessionId = request.getResponseHeader('X-Transmission-Session-Id'))
        ) {
          transmission.SessionId = SessionId;
          transmission.headers['X-Transmission-Session-Id'] = SessionId;
          void $.ajax(settings);
        } else {
          if (transmission.on.postError) {
            // @ts-expect-error
            transmission.on.postError(request);
          }
        }
      },
      headers: this.headers,
    };
    void $.ajax(settings);
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
  getSession: function (callback?: (data: unknown) => void) {
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
  addTorrentFromUrl: function (
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
  addTorrentFromFile: function (
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
  _onTorrentCountChange: function () {
    this.torrents.loadSimpleInfo = false;
    if (this.on.torrentCountChange) {
      // @ts-expect-error
      this.on.torrentCountChange();
    }
  },
  // 删除种子
  removeTorrent: function (ids: string[], removeData: boolean, callback?: (data: any) => void) {
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
  getFreeSpace: function (path: string, callback?: (data: any) => void) {
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
  updateBlocklist: function (callback?: (data: any) => void) {
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
  renameTorrent: function (
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
  closeSession: function (callback?: (data: unknown) => void) {
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

    /* eslint-disable */

    all: null as Record<string, Torrent> | null,
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
    folders: {},
    getConfig(id: string, callback: (torrents: Torrent[] | null) => void) {
      this.getMoreInfos(this.fields.config, id, callback);
    },
    getErrorIds: function (ignore: any, needUpdateOnly: boolean) {
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
    getFiles: function (id: any, callback: any) {
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

    getMagnetLink: function (ids: string[], callback: any) {
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
      const req_list = [];
      for (const id of ids) {
        const t = this.all?.[id];
        if (!t) {
          continue;
        }
        if (!t.magnetLink) {
          req_list.push(id);
        } else {
          result += t.magnetLink + '\n';
        }
      }

      if (req_list.length == 0) {
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
            ids: req_list,
          },
        },
        function (data) {
          if (data.result == 'success') {
            for (const item of data.arguments.torrents) {
              transmission.torrents.all![item.id]!.magnetLink = item.magnetLink;
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
    getMoreInfos: function (fields: any, ids: any, callback: (torrents: Torrent[] | null) => void) {
      transmission.exec(
        {
          method: 'torrent-get',
          arguments: {
            fields: fields,
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
    getPeers: function (ids: string[]) {
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
    getallids: function (
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
      if (this.all && ids == undefined) {
        args.ids = 'recently-active';
        this.isRecentlyActive = true;
      } else if (ids) {
        args.ids = ids;
      }
      if (!this.all) {
        this.all = {};
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
            transmission.torrents.splitid();
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

    search: function (key: any, source: any) {
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

    searchAndReplaceTrackers: function (
      oldTracker: string,
      newTracker: string,
      callback: (result: null, count?: number) => void,
    ) {
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
          result[index].ids,
        );
      }
    },
    // 获取指定种子的文件列表
    searchResult: null,
    // 获取指定种子的设置信息

    splitid: function () {
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
          if (this.all![item.id]) {
            delete this.all![item.id];
          }
          delete this.datas[index];

          continue;
        }
        // If the current torrent is being acquired and there is no such torrent in the previous torrent list, that is, the new torrent needs to be reloaded with the basic information
        // @ts-expect-error
        if (this.isRecentlyActive && !this.all[item.id]) {
          // @ts-expect-error
          this.newIds.push(item.id);
        }
        // @ts-expect-error
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
          item.remainingTime = Math.floor((item.leftUntilDone / item.rateDownload) * 1000);
        } else if (item.rateDownload == 0 && item.leftUntilDone == 0 && item.totalSize != 0) {
          item.remainingTime = 0;
        } else {
          // ~100 years
          item.remainingTime = 3153600000000;
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

        // @ts-expect-error
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
            for (const i in folder) {
              const text = folder[i];
              if (!text) {
                continue;
              }
              const key = Base64.encode(text);
              // 去除特殊字符
              folderkey += key.replace(/[+|\/|=]/g, '0');
              // @ts-expect-error
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
              // @ts-expect-error
              this.folders[folderkey] = node;
            }
          }
        }

        this.count++;
      }
      transmission.downloadDirs = transmission.downloadDirs.sort();

      // If there a need to acquire new seeds
      if (this.newIds.length > 0) {
        this.getallids(null, this.newIds);
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
  hashString: string;
  isPrivate: boolean;
  addedDate: number;
  peersGettingFromUs: string;
  peersSendingToUs: string;
  leecher: string;
  seeder: string;
  trackers: string;
  warning: string;
  seederCount: number;
  leecherCount: number;
  id: number;
  name: string;
  status: number;
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
  error: unknown;
  errorString: string;
  doneDate: number;
  queuePosition: number;
  activityDate: number;
}

export type Transmission = typeof transmission;

globalThis.transmission = transmission;
