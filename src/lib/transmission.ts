import $ from 'jquery';

export const transmission = {
  torrents: null as any,
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
  trackers: {},
  islocal: false,
  // The list of directories that currently exist
  downloadDirs: [],
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
      this.headers.Authorization = 'Basic ' + btoa(this.username + ':' + this.password);
    }

    this.fullpath = this.rpcpath;
    // this.getSessionId(this).finally(callback);
    this.getSessionId(this, callback);
  },
  /**
   * 执行指定的命令
   * @param  {[type]}   config   [description]
   * @param  {Function} callback [description]
   * @param  {[type]}   tags     [description]
   * @return {[type]}            [description]
   */
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
                } else callback('error');
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
        if (callback != null) callback(data.result);
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
        if (callback != null) callback(result);
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
        if (callback != null) callback(data.result);
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
    const torrent = this.torrents.all[torrentId];
    if (!torrent) return false;

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
        if (callback != null) callback(data);
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
        if (callback != null) callback(result);
      },
    );
  },
};

export type Transmission = typeof transmission;

// @ts-expect-error set global
globalThis.transmission = transmission;

/*
(function($){
	var items = $("script");
	var index = -1;
	for (var i=0;i<items.length ;i++ )
	{
		var src = items[i].src.toLowerCase();
		index = src.indexOf("min/transmission.js");
		if (index!=-1)
		{
			// 种子相关信息
			$.getScript("script/min/transmission.torrents.js");
			break;
		}
	}
	if (index==-1)
	{
		$.getScript("script/transmission.torrents.js");
	}
})(jQuery);
*/
