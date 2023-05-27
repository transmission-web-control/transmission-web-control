import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import 'ag-grid-enterprise';
import './grid-style.css';

import {
  type ColDef,
  type GetContextMenuItemsParams,
  Grid,
  type GridOptions,
  type LabelFormatterParams,
  type MenuItemDef,
  type ValueGetterFunc,
} from 'ag-grid-community';
import type JQuery from 'jquery';
import { Base64 } from 'js-base64';
import * as lo from 'lodash-es';

import i18nManifest from '../i18n.json';
import enLocal from '../i18n/en.json';
import { events, userActions } from './events';
import { formatDuration, formatLongTime } from './formatter';
import torrentFields, { type Field } from './torrent-fields';
import { type ProcessedTorrent, TorrentStatus, transmission } from './transmission';
import { formatSize } from './utils';
import { APP_VERSION } from './version';

const i18n = import.meta.glob('../i18n/*.json', { eager: true });
const easyUILocale: Record<`../twc/easyui/locale/easyui-lang-${string}.js`, string> =
  import.meta.glob('../twc/easyui/locale/easyui-lang-*.js', {
    eager: true,
    as: 'raw',
  });

export const templateFiles: Record<`../twc/template/${string}.html`, string> = import.meta.glob(
  '../twc/template/*.html',
  {
    eager: true,
    as: 'raw',
  },
);

export class SystemBase {
  version = APP_VERSION;
  rootPath = 'tr-web-control/';
  configHead = 'transmission-web-control';
  gridState = 'transmission-web-control/grid-state';
  defaultLang = enLocal;
  languages = i18nManifest;
  // default config, can be customized in config.js
  public config = {
    autoReload: true,
    reloadStep: 5000,
    pageSize: 30,
    pagination: true,
    pageList: [10, 20, 30, 40, 50, 100, 150, 200, 250, 300, 5000],
    defaultSelectNode: null,
    autoExpandAttribute: false,
    defaultLang: 'en',
    foldersShow: false,
    // theme
    theme: 'gray',
    // 是否显示BT服务器
    showBTServers: false,
    // ipinfo.io token
    ipInfoToken: '',
    ipInfoFlagUrl: '',
    ipInfoDetailUrl: '',
    ui: {
      status: {
        tree: {},
        layout: {
          main: {},
          body: {},
          left: {},
        },
        panel: {},
        size: {
          nav: {},
          attribute: {},
        },
      },
    },
    hideSubfolders: false,
    simpleCheckMode: false,
    nav: {
      servers: true,
      folders: true,
      statistics: true,
      labels: false,
    },
    labels: [],
    labelMaps: {},
    ignoreVersion: [],
  };

  storageKeys = {
    fieldOrder: 'dataGrid.fields.order',
    dictionary: {
      folders: 'dictionary.folders',
    } as const,
  } as const;

  // Local data storage
  dictionary = {
    folders: null,
  };

  checkUpdateScript =
    'https://api.github.com/repos/transmission-web-control/transmission-web-control/releases/latest';

  panel = {
    main: $('#main'),
    top: $('#m_top'),
    toolbar: $('#m_toolbar'),
    left_layout: $('#m_left_layout'),
    left: $('#m_left'),
    body: $('#m_body'),
    layout_body: $('#layout_body'),
    layout_left: $('#layout_left'),
    list: $('#m_list'),
    attribute: $('#m_attribute'),
    bottom: $('#m_bottom'),
    title: $('#m_title'),
    status: $('#m_status'),
    statusbar: $('#m_statusbar'),
    status_text: $('#status_text'),
    droparea: $('#dropArea'),
  };

  lang = enLocal;
  langInit = false;
  autoReloadTimer?: ReturnType<typeof setTimeout>;
  downloadDir = '';
  // The currently selected torrent number
  public currentTorrentId = 0;
  flags = [];
  ipdetail = [];
  control = {
    tree: null,
    torrentList: null as any as Grid,
    grid: null as any as GridOptions<ProcessedTorrent>,
  };

  userConfig = {
    torrentList: {
      fields: [] as Field[],
      sortName: null,
      sortOrder: 'asc',
    },
  };

  serverConfig = null;
  serverSessionStats = null;
  // 当前已选中的行
  checkedRows: ProcessedTorrent[] = [];
  uiIsInitialized = false;
  popoverCount = 0;

  // 当前数据目录，用于添加任务的快速保存路径选择
  currentListDir = '';

  // Dialog Templates Temporary list
  public readonly templates: Record<string, string> = {};
  private lastUIStatus: any;

  /**
   * 程序初始化
   */
  init(lang: string) {
    this.readConfig();
    this.lastUIStatus = JSON.parse(JSON.stringify(this.config.ui.status));

    if (!system.langInit) {
      this.setLang(lang);
      system.langInit = true;
    }

    // @ts-expect-error
    this.initData();
    this.initEvent2();
  }

  // Load the parameters from cookies
  readConfig() {
    this.readUserConfig();
    // 将原来的cookies的方式改为本地存储的方式
    const config = this.getStorageData(this.configHead + '.system');
    if (config) {
      this.config = lo.merge(this.config, JSON.parse(config));
    }

    for (const [key, value] of Object.entries(this.storageKeys.dictionary)) {
      this.dictionary[key as 'folders'] = this.getStorageData(value);
    }
  }

  readUserConfig() {
    const local = window.localStorage[this.configHead];
    if (local) {
      const localOptions = JSON.parse(local);
      this.userConfig = lo.merge(this.userConfig, localOptions);
    }
  }

  /**
   * 设置语言
   */
  setLang(lang: string) {
    // If no language is specified, acquires the current browser default language
    if (!lang) {
      if (this.config.defaultLang) {
        lang = this.config.defaultLang;
      }
    }

    if (!lang) {
      lang = 'zh-CN';
    }

    // 统一使用 _ 替代 -
    lang = lang.replace('-', '_');

    const langFile = `../i18n/${lang}.json`;
    if (langFile in i18n) {
      this.lang = lo.merge(this.defaultLang, i18n[langFile]);
    }

    this.resetLangText();

    // Set the easyui language
    const easyUILangFile = `../twc/easyui/locale/easyui-lang-${lang}.js` as const;
    if (easyUILangFile in easyUILocale) {
      eval(easyUILocale[easyUILangFile] as string);
    } else {
      eval(easyUILocale['../twc/easyui/locale/easyui-lang-en.js'] as string);
    }
  }

  // Set the language information
  resetLangText(parent?: JQuery) {
    if (!parent) {
      parent = $(document.body);
    }
    let items = parent.find('*[system-lang]');

    const system = this;

    $.each(items, function (key, item) {
      const name = $(item).attr('system-lang') as string;
      $(item).html(lo.get(system.lang, name) as string);
    });

    items = parent.find('*[system-tip-lang]');

    $.each(items, function (key, item) {
      const name = $(item).attr('system-tip-lang') as string;
      $(item).attr('title', lo.get(system.lang, name) as string);
    });
  }

  /**
   * Opens the specified template window
   * 打开指定的模板
   *  type: 0 窗口，1 tooltip；默认为 0
   */
  openDialogFromTemplate<T = unknown>(config: {
    onClose?: (source?: T) => void;
    id: string;
    options: Record<string, string | number | boolean>;
    datas?: Record<string, any>;
    // 0 窗口，1 tooltip
    type?: number;
    source?: T;
  }) {
    config = lo.merge(
      {
        type: 0,
      },
      config,
    );

    if (!config.id) {
      return;
    }

    const dialogId = config.id;
    const datas = config.datas;

    let dialog = $(`#${dialogId}`);
    if (dialog.length) {
      if (datas) {
        lo.forOwn(datas, function (value, key) {
          dialog.data(key, value);
        });
      }

      if (config.type == 0 && dialog.attr('type') === '0') {
        dialog.dialog('open');
        dialog.dialog({
          content: this.templates[dialogId],
        });
        return;
      } else {
        if (this.popoverCount !== 0) {
          setTimeout(() => {
            this.openDialogFromTemplate(config);
          }, 350);
          return;
        }
        dialog.remove();
      }
    }

    const defaultOptions = {
      title: '',
      width: 100,
      height: 100,
      resizable: false,
      cache: true,
      content: this.lang.dialog['system-config'].loading,
      modal: true,
    };

    const opt = lo.merge(defaultOptions, config.options);

    dialog = $('<div/>').attr({ id: dialogId, type: config.type }).appendTo(document.body);

    const sys = this;
    if (config.type === 0) {
      dialog.dialog(opt);
    } else {
      dialog.css({ width: opt.width, height: opt.height }).data('popoverSource', config.source);

      // @ts-expect-error
      $(config.source).webuiPopover({
        url: `#${dialogId}`,
        title: opt.title,
        width: opt.width,
        height: opt.height - 18,
        padding: false,
        onHide(e: JQuery) {
          // @ts-expect-error
          $(config.source).webuiPopover('destroy');
          $(`#${dialogId}`).remove();
          $(e).remove();
          sys.popoverCount--;
          if (config.onClose) {
            console.log('config.onClose');
            config.onClose(config.source);
          }
        },
        onShow() {
          sys.popoverCount++;
        },
      });
    }

    const dialogFileLoaded = (data: string) => {
      this.templates[dialogId] = data;
      if (datas) {
        lo.forOwn(datas, (value, key) => {
          $(`#${dialogId}`).data(key, value);
        });
      }

      if (config.type == 0) {
        $(`#${dialogId}`).dialog({ content: data });
      } else {
        dialog.html(data);
        $.parser.parse(`#${dialogId}`);
        // @ts-expect-error
        $(config.source).webuiPopover('show');
      }
    };

    const templateContent = templateFiles[`../twc/template/${dialogId}.html`];
    if (templateContent) {
      dialogFileLoaded(templateContent);
    } else {
      alert(`can't find dialog template ${dialogId}`);
    }
  }

  execPlugin(key: string) {
    if (key === 'replace-tracker') {
      this.openDialogFromTemplate({
        id: 'dialog-system-replaceTracker',
        options: {
          title: this.lang.dialog['system-replaceTracker'].title,
          width: 600,
          height: 220,
        },
      });
    }
  }

  saveUserConfig() {
    this.setStorageData(this.configHead, JSON.stringify(this.userConfig));
  }

  getStorageData(key: string, defaultValue?: any): any {
    return window.localStorage[key] == null ? defaultValue : window.localStorage[key];
  }

  setStorageData(key: string, value: string) {
    window.localStorage.setItem(key, value);
  }

  // Save the parameters in cookies
  saveConfig() {
    this.setStorageData(this.configHead + '.system', JSON.stringify(this.config));
    for (const key in this.storageKeys.dictionary) {
      // @ts-expect-error
      this.setStorageData(this.storageKeys.dictionary[key], this.dictionary[key]);
    }
    this.saveUserConfig();
  }

  // Initialize the torrent list display table
  initTorrentTable() {
    $('<div id="myGrid" class="ag-theme-alpine torrent-list"></div>').appendTo(this.panel.list);
    const eGridDiv = document.querySelector('#myGrid');

    const fields = torrentFields.fields;

    const stateRaw = this.getStorageData(this.gridState);

    const fieldOrderRaw = this.getStorageData(this.storageKeys.fieldOrder);

    const fieldOrder: string[] = fieldOrderRaw
      ? JSON.parse(fieldOrderRaw)
      : torrentFields.fields.map((x) => x.field);

    this.control.grid = {
      rowHeight: 20,
      headerHeight: 30,
      columnDefs: fields
        .filter((o) => o.field.toString() !== 'ck')
        .sort((a, b) => fieldOrder.indexOf(a.field) - fieldOrder.indexOf(b.field))
        .map((o) => {
          const formatter: undefined | ((value: any) => string) = this.getFieldFormat(
            o.formatter_type,
          );
          let valueGetter: undefined | ((params: { data: ProcessedTorrent; value: number }) => any);
          const opt: Record<string, any> = {};
          if (o.formatter_type === 'progress') {
            opt.cellRenderer = (params: { data: ProcessedTorrent; value: number }) => {
              const torrent = params.data;
              return getTorrentProgressBar(params.value * 100, torrent);
            };
          }
          if (o.formatter_type === 'html') {
            opt.cellRenderer = (params: LabelFormatterParams) => {
              return params.value;
            };
          }

          if (o.field === 'status') {
            valueGetter = (params) => {
              const torrent: ProcessedTorrent = params.data;
              const status = this.lang.torrent.statusText[torrent.status];
              if (torrent.error != 0) {
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                return `<span class='text-status-error' title='${torrent.errorString}'>${status}</span>`;
              } else if (torrent.warning) {
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                return `<span class='text-status-warning' title='${torrent.warning}'>${status}</span>`;
              }
              return status;
            };
          }

          if (o.field === 'completeSize') {
            valueGetter = (params) => {
              return params.data.totalSize - params.data.leftUntilDone;
            };
          }

          return {
            ...opt,
            headerName: this.lang.torrent.fields[o.field],
            field: o.field,
            valueGetter: valueGetter as unknown as ValueGetterFunc<ProcessedTorrent>,
            width: o.width,
            valueFormatter: formatter ? ({ value }: { value: any }) => formatter(value) : undefined,
            initialWidth: o.width,
          };
        }),
      autoSizePadding: 0,
      allowContextMenuWithControlKey: true,
      suppressContextMenu: false,
      getContextMenuItems: this.torrentContextMenu.bind(this),
      defaultColDef: {
        sortable: true,
        resizable: true,
        menuTabs: ['columnsMenuTab'],
      },
      rowSelection: 'multiple' as const,
      getRowId: (params: any) => params.data.hashString,
      onColumnMoved: (e) => {
        const newFieldOrder = e.api.getColumnDefs()?.map((c: ColDef) => c.field) as string[];
        this.setStorageData(this.storageKeys.fieldOrder, JSON.stringify(newFieldOrder));
      },
      suppressCellFocus: true,
      onRowClicked: (e) => {
        this.checkedRows = this.control.grid.api?.getSelectedRows() ?? [];
        this.currentTorrentId = e.data!.id;
        userActions.emit('selectTorrent', e.rowIndex!, e.data!);
        userActions.emit('onSelected');
      },
    };

    console.groupCollapsed('hide');
    this.control.torrentList = new Grid(eGridDiv as HTMLElement, this.control.grid);
    console.groupEnd();

    if (stateRaw) {
      this.control.grid.columnApi?.applyColumnState({ state: JSON.parse(stateRaw) });
    }

    window.onbeforeunload = () => {
      this.setStorageData(
        this.gridState,
        JSON.stringify(this.control.grid.columnApi?.getColumnState()),
      );
    };

    userActions.on('selectTorrent', (i, t) => {
      // @ts-expect-error
      this.checkTorrentRow(i, t);
    });
    // this.control.grid.api?.setHeaderHeight();
  } // end initTorrentTable

  // Set the field display format
  getFieldFormat(type?: string) {
    if (!type) {
      return;
    }

    switch (type) {
      case 'size':
        return (value: number) => {
          return formatSize(value);
        };
      case 'speed':
        return function (value: number) {
          return formatSize(value, true, 'speed');
        };
      case 'longtime':
        return function (value: string) {
          return formatLongTime(value);
        };
      case 'progress':
        return;
      case 'ratio':
        return function (value: number) {
          return value.toFixed(2);
        };
      case 'remainingTime':
        return function (value: number) {
          if (value >= 3153600000) {
            return '∞';
          }
          return formatDuration(value);
        };
    }
  }

  // Retrieve the torrent information again
  async reloadTorrentBaseInfos(
    ids?: Array<string | number>,
    moreFields?: Array<keyof ProcessedTorrent>,
  ) {
    await this.fetchData(false);
  }

  updateTreeNodesUI() {
    throw new Error('BUG: NEED OVERRIDE');
  }

  // Displays the current torrent count and size
  showNodeMoreInfos(count: number = 0, size: number = 0) {
    let result = '';
    if (count > 0) {
      result = ` <span class='nav-torrents-number'>(${count})</span>`;
    }
    if (size > 0) {
      result += `<span class='nav-total-size'>[${formatSize(size)}]</span>`;
    }

    return result;
  }

  torrentContextMenu(
    params: GetContextMenuItemsParams<ProcessedTorrent>,
  ): Array<string | MenuItemDef> {
    const torrent = params.node!.data as ProcessedTorrent;

    const selected = this.control.grid.api?.getSelectedRows() ?? [];
    if (!selected.length) {
      selected.push(torrent);
    }

    const statusMenu = [];

    if (torrent.status === TorrentStatus.stopped) {
      statusMenu.push({
        name: this.lang.toolbar.tip.start,
        action: () => {
          const ids = selected.map((t) => t.hashString);
          void transmission
            .execAsync({
              method: 'torrent-start',
              arguments: {
                ids,
              },
            })
            .then(() => events.emit('userChangeTorrent', ids));
        },
      });
    } else if (
      [
        TorrentStatus.seedwait,
        TorrentStatus.seed,
        TorrentStatus.downloadwait,
        TorrentStatus.download,
      ].includes(torrent.status)
    ) {
      statusMenu.push({
        name: this.lang.toolbar.tip.pause,
        action: () => {
          const ids = selected.map((t) => t.hashString);
          void transmission
            .execAsync({
              method: 'torrent-stop',
              arguments: {
                ids,
              },
            })
            .then(() => events.emit('userChangeTorrent', ids));
        },
      });
    }

    return [
      ...statusMenu,
      'separator',
      {
        name: this.lang.toolbar.tip.rename,
        action: () => {
          const ids = selected.map((x) => x.id);
          system.openDialogFromTemplate({
            id: 'dialog-torrent-rename',
            options: {
              title: this.lang.dialog['torrent-rename'].title,
              width: 520,
              height: 200,
              resizable: true,
            },
            datas: {
              id: torrent.id,
            },
            onClose: () => {
              events.emit('userChangeTorrent', ids);
            },
          });
        },
      },
      {
        name: this.lang.toolbar.tip.remove,
        action: () => {
          const ids = selected.map((x) => x.id);
          system.openDialogFromTemplate({
            id: 'dialog-torrent-remove-confirm',
            options: {
              title: this.lang.dialog['torrent-remove'].title,
              width: 350,
              height: 150,
            },
            datas: {
              ids,
            },
            onClose: () => {
              events.emit('userChangeTorrent', ids);
            },
          });
        },
      },
      {
        name: this.lang.toolbar.tip.recheck,
        action: () => {
          const ids = selected.map((t) => t.hashString);
          void transmission
            .execAsync({
              method: 'torrent-verify',
              arguments: {
                ids,
              },
            })
            .then(() => events.emit('userChangeTorrent', ids));
        },
      },
      'separator',
      {
        name: this.lang.toolbar.tip['more-peers'],
        action: () => {
          const ids = selected.map((t) => t.hashString);
          void transmission
            .execAsync({
              method: 'torrent-reannounce',
              arguments: {
                ids,
              },
            })
            .then(() => events.emit('userChangeTorrent', ids));
        },
      },
      // TODO
      // {
      //   name: this.lang.toolbar.tip['change-download-dir'],
      // },
      'separator',
      {
        name: this.lang.toolbar.tip['copy-path-to-clipboard'],
        action: () => {
          void navigator.clipboard.writeText(torrent.downloadDir);
        },
      },
      // TODO:
      // 'separator',
      // {
      //   name: this.lang.menus.queue['move-top'],
      // },
      // {
      //   name: this.lang.menus.queue['move-up'],
      // },
      // {
      //   name: this.lang.menus.queue['move-down'],
      // },
      // {
      //   name: this.lang.menus.queue['move-bottom'],
      // },
      {
        name: this.lang.menus.copyMagnetLink,
        action: () => {
          void transmission.torrents.getMagnetLink(selected.map((t) => t.id)).then((magnet) => {
            return navigator.clipboard.writeText(magnet);
          });
        },
      },
    ];
  }

  allTorrents: Map<number, ProcessedTorrent> = new Map<number, ProcessedTorrent>();

  torrentStatusTree: Record<TorrentStatus, number[]> = {
    '0': [],
    '1': [],
    '2': [],
    '3': [],
    '4': [],
    '5': [],
    '6': [],
  };

  torrentStatusExtra = {
    warning: [] as number[],
    error: [] as number[],
    active: [] as number[],
  };

  trackersTree: Record<
    string,
    {
      connected?: boolean;
      pt: boolean;
      size: number;
      torrents: number[];
    }
  > = {};

  fsTreeNodes = {} as Record<
    string,
    {
      path: string;
      count: number;
      torrents: ProcessedTorrent[];
      size: number;
      nodeid: string;
    }
  >;

  buildTreeNodesData() {
    Object.keys(this.torrentStatusTree).forEach((key) => {
      // @ts-expect-error
      this.torrentStatusTree[key] = [];
    });

    this.torrentStatusExtra = {
      warning: [],
      error: [],
      active: [],
    };

    this.trackersTree = {};

    this.fsTreeNodes = {};

    this.allTorrents.forEach((value, key) => {
      if (value.isPrivate) {
        const warningTracker = value.trackerStats.find(
          (s) => s.announceState === transmission._trackerStatus.inactive,
        );
        if (warningTracker) {
          this.torrentStatusExtra.warning.push(key);
        }
      }
      if (value.error) {
        this.torrentStatusExtra.error.push(key);
      }
      if (value.rateUpload + value.rateDownload !== 0) {
        this.torrentStatusExtra.active.push(key);
      }
      this.torrentStatusTree[value.status].push(key);
      value.trackerStats.forEach((tracker) => {
        const tree = (this.trackersTree[tracker.sitename ?? tracker.host] ??= {
          pt: value.isPrivate,
          size: 0,
          torrents: [],
        });
        tree.torrents.push(key);
        tree.size += value.totalSize;
      });

      const folder = value.downloadDir.replaceAll(/\\/g, '/').replaceAll(/\/*$/g, '').split('/');
      let folderkey = 'folders';
      const component = [];
      for (const text of folder) {
        component.push(text);
        const key = Base64.encode(text);
        // 去除特殊字符
        folderkey += key.replace(/[+|\/|=]/g, '0') + '-';
        const thisKey = folderkey.slice(0, -1);
        let node = this.fsTreeNodes[thisKey];
        if (!node) {
          node = {
            count: 0,
            torrents: [],
            size: 0,
            path: component.join('/'),
            nodeid: thisKey,
          };
        }
        node.torrents.push(value);
        node.count++;
        node.size += value.totalSize;
        this.fsTreeNodes[thisKey] = node;
      }
    });
  }

  async onTorrentDataChange() {
    console.log('onTorrentDataChange');
    this.buildTreeNodesData();
    this.refreshDataGrid();
  }

  torrentFilter = (t?: ProcessedTorrent): boolean => true;

  refreshDataGrid() {
    this.control.grid.api?.setRowData(
      Array.from(this.allTorrents.values()).filter(this.torrentFilter),
    );
  }

  async fetchFull() {
    const { torrents } = await transmission.fetchALl();
    torrents.forEach((item) => {
      this.allTorrents.set(item.id, item);
    });
  }

  async fetchDelta() {
    const { removed, torrents } = await transmission.fetchDelta();
    torrents.forEach((item) => {
      this.allTorrents.set(item.id, item);
    });

    removed.forEach((id) => {
      this.allTorrents.delete(id);
    });
  }

  async fetchData(forceAll?: boolean) {
    if (forceAll === undefined) {
      if (this.config.reloadStep >= 50 * 1000) {
        await this.fetchFull();
      } else {
        await this.fetchDelta();
      }
    } else if (forceAll) {
      await this.fetchFull();
    } else {
      await this.fetchDelta();
    }

    await this.onTorrentDataChange();

    this.updateTreeNodesUI();
  }

  async init2() {
    await transmission.init();

    const { torrents } = await transmission.fetchALl();
    this.allTorrents = new Map(torrents.map((x) => [x.id, x]));

    if (!this.config.autoReload) {
      return;
    }

    const timer = () => {
      console.log('timer');
      this.fetchData().finally(() => {
        this.autoReloadTimer = setTimeout(timer, this.config.reloadStep);
      });
    };

    console.log(`start timer ${this.config.reloadStep}`);
    this.autoReloadTimer = setTimeout(timer, this.config.reloadStep);
    void this.fetchData(true).then(() => {
      this.initUIStatus();
    });
  }

  initEvent2() {
    console.log('init event 2');
    events.on('userChangeTorrent', (ids) => {
      console.debug(`user change torrent setting, reload from server ${ids}`);
      void this.fetchData(false);
    });
    void this.init2();
  }

  // connect to the server
  async connect() {
    this.showStatus(this.lang.system.status.connect, 0);
    // When submitting an error
    transmission.event.on('error', (e) => {
      console.error(`transmission error ${e}`);
      system.reloadTorrentBaseInfos();
    });
    // Initialize the connection
    // @ts-expect-error
    system.reloadSession();
    // @ts-expect-error
    system.getServerStatus();

    this.showStatus(this.lang.system.status.connected);
  }

  // Displays status information
  showStatus(msg: string, outTime: number = 3000) {
    // @ts-expect-error
    if ($('#m_status').panel('options').collapsed) {
      // @ts-expect-error
      $('#layout_left').layout('expand', 'south');
    }
    this.panel.status_text.show();
    if (msg) {
      this.panel.status_text.html(msg);
    }
    if (outTime == 0) {
      return;
    }
    this.panel.status_text.fadeOut(outTime, function () {
      // @ts-expect-error
      $('#layout_left').layout('collapse', 'south');
    });
  }

  /**
   * @deprecated
   */
  getTorrentProgressBar(progress: number, torrent: ProcessedTorrent) {
    return getTorrentProgressBar(progress, torrent);
  }

  /**
   * 重置导航栏数据目录信息
   */

  rebuildNavFolders() {
    // @ts-expect-error
    this.removeTreeNode('folders-loading');

    for (const [nodeID, node] of Object.entries(this.fsTreeNodes)) {
      if (!node.path) {
        continue;
      }

      // @ts-expect-error
      const previous = this.panel.left.tree('find', nodeID);
      if (previous) {
        // @ts-expect-error
        this.panel.left.tree('update', {
          target: previous.target,
          data: {
            ...previous,
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            text: previous.path + this.showNodeMoreInfos(node.count, node.size),
            iconCls: 'iconfont tr-icon-file',
          },
        });
      } else {
        const keys = nodeID.split('-');
        const parentKey = keys.slice(0, -1).join('-');
        // @ts-expect-error
        const parent = this.panel.left.tree('find', parentKey);
        if (parent) {
          const lengthTrim: number = parent.fullPath?.length ?? 0;
          // @ts-expect-error
          this.panel.left.tree('append', {
            parent: parent.target,
            data: {
              id: nodeID,
              // state: 'closed',
              path: node.path.slice(lengthTrim + 1),
              fullPath: node.path,
              downDir: node.path.slice(lengthTrim + 1),
              text: node.path.slice(lengthTrim + 1) + this.showNodeMoreInfos(node.count, node.size),
              iconCls: 'iconfont tr-icon-file',
            },
          });
        }
      }
    }
  }

  private initUIStatus() {
    throw new Error('BUG: NEED OVERRIDE');
  }
}

// Gets the progress bar for the specified torrent
export function getTorrentProgressBar(progress: number, torrent: ProcessedTorrent): string {
  let className = '';
  let status = 0;
  if (typeof torrent === 'object') {
    status = torrent.status;
  } else {
    status = torrent;
  }

  switch (status) {
    case transmission._status.stopped:
      className = 'torrent-progress-stop';
      break;

    case transmission._status.checkwait:
    case transmission._status.check:
      className = 'torrent-progress-check';
      break;

    case transmission._status.downloadwait:
    case transmission._status.download:
      className = 'torrent-progress-download';
      break;

    case transmission._status.seedwait:
    case transmission._status.seed:
      className = 'torrent-progress-seed';
      break;
  }
  if (typeof torrent === 'object') {
    if (torrent.warning) {
      className = 'torrent-progress-warning';
    }
    if (torrent.error != 0) {
      className = 'torrent-progress-error';
    }
  }

  if (status == TorrentStatus.check) {
    // 目前只有status==_status.download时 torrent 不是对象
    // 检查进度条长度保持在已完成的范围内
    const percentCheckText = (torrent.recheckProgress * 100).toFixed(2);
    const percentCheckView = (progress * torrent.recheckProgress).toFixed(2);
    return `<div class="torrent-progress" title="${progress}%">
          <div class="torrent-progress-text" style="z-index:2;">${percentCheckText}%</div>
          <div class="torrent-progress-bar torrent-progress-seed" style="width:${percentCheckView}%;z-index:1;opacity:0.7;"></div>
          <div class="torrent-progress-bar ${className}" style="width:${progress}%;"></div>
        </div>`;
  }

  return `<div class="torrent-progress" title="${progress}%">
         <div class="torrent-progress-text">${progress}%</div>
         <div class="torrent-progress-bar ${className}" style="width:${progress}%;"></div>
       </div>`;
}
