import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import 'ag-grid-enterprise';
import './grid-style.css';

import {
  type GetContextMenuItemsParams,
  Grid,
  type GridOptions,
  type LabelFormatterParams,
  type MenuItemDef,
  type ValueGetterFunc,
} from 'ag-grid-community';
import * as lo from 'lodash-es';

import i18nManifest from '../i18n.json';
import enLocal from '../i18n/en.json';
import { formatDuration, formatLongTime } from './formatter';
import torrentFields, { type Field } from './torrent-fields';
import { type Torrent, TorrentStatus, transmission } from './transmission';
import { userActions } from './user-actions';
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
    theme: 'default',
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
    dictionary: {
      folders: 'dictionary.folders',
    },
  };

  // Local data storage
  dictionary = {
    folders: null,
  };

  checkUpdateScript =
    'https://api.github.com/repos/transmission-web-control/transmission-web-control/releases/latest';

  contextMenus = {};
  panel: Record<string, JQuery<HTMLElement>> = {};
  lang = enLocal;
  langInit = false;
  reloading = false;
  autoReloadTimer = null;
  downloadDir = '';
  // The currently selected torrent number
  public currentTorrentId = 0;
  flags = [];
  ipdetail = [];
  control = {
    tree: null,
    torrentList: null as any as Grid,
    grid: null as any as GridOptions<Torrent>,
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
  checkedRows = [];
  uiIsInitialized = false;
  popoverCount = 0;

  // 当前数据目录，用于添加任务的快速保存路径选择
  currentListDir = '';

  themes = [
    {
      value: 'default',
      text: 'Default',
      group: 'Base',
    },
    {
      value: 'gray',
      text: 'Gray',
      group: 'Base',
    },
    {
      value: 'metro',
      text: 'Metro',
      group: 'Base',
    },
    {
      value: 'material',
      text: 'Material',
      group: 'Base',
    },
    {
      value: 'bootstrap',
      text: 'Bootstrap',
      group: 'Base',
    },
    {
      value: 'black;logo-white.png',
      text: 'Black',
      group: 'Base',
    },
    {
      value: 'metro-blue',
      text: 'Metro Blue',
      group: 'Metro',
    },
    {
      value: 'metro-gray',
      text: 'Metro Gray',
      group: 'Metro',
    },
    {
      value: 'metro-green',
      text: 'Metro Green',
      group: 'Metro',
    },
    {
      value: 'metro-orange',
      text: 'Metro Orange',
      group: 'Metro',
    },
    {
      value: 'metro-red',
      text: 'Metro Red',
      group: 'Metro',
    },
    {
      value: 'ui-cupertino',
      text: 'Cupertino',
      group: 'UI',
    },
    {
      value: 'ui-dark-hive;logo-white.png',
      text: 'Dark Hive',
      group: 'UI',
    },
    {
      value: 'ui-pepper-grinder',
      text: 'Pepper Grinder',
      group: 'UI',
    },
    {
      value: 'ui-sunny',
      text: 'Sunny',
      group: 'UI',
    },
  ];

  // Dialog Templates Temporary list
  public readonly templates: Record<string, string> = {};

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
    options: Record<string, string | number>;
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
    console.log('save config');
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

  /**
   * 初始化主题
   */
  initThemes() {
    if (this.themes) {
      const system = this;
      // @ts-expect-error
      $('#select-themes').combobox({
        groupField: 'group',
        data: this.themes,
        editable: false,
        panelHeight: 'auto',
        onChange(value: string) {
          const values = (value + ';').split(';');
          const theme = values[0] as string;
          const logo = values[1] || 'logo.png';
          $('#styleEasyui').attr('href', `tr-web-control/script/easyui/themes/${theme}/easyui.css`);
          $('#logo').attr('src', 'tr-web-control/' + logo);
          system.config.theme = value;
          system.saveConfig();
        },
        onLoadSuccess() {
          // @ts-expect-error
          $(this).combobox('setValue', system.config.theme || 'default');
        },
      });
    }
  }

  // Initialize the torrent list display table
  initTorrentTable() {
    $('<div id="myGrid" class="ag-theme-alpine torrent-list"></div>').appendTo(this.panel.list!);
    const eGridDiv = document.querySelector('#myGrid');
    const userEnabledField =
      this.userConfig.torrentList.fields.length === 0
        ? torrentFields.fields
        : this.userConfig.torrentList.fields;
    const fields = torrentFields.fields;

    const enabledFieldNames = new Set(userEnabledField.map((x) => x.field));

    const stateRaw = this.getStorageData(this.gridState);

    this.control.grid = {
      rowHeight: 20,
      headerHeight: 30,
      columnDefs: fields
        .filter((o) => o.field.toString() !== 'ck')
        .map((o) => {
          const formatter: undefined | ((value: any) => string) = this.getFieldFormat(
            o.formatter_type,
          );
          let valueGetter: undefined | ((params: { data: Torrent; value: number }) => any);
          const opt: Record<string, any> = {};
          if (o.formatter_type === 'progress') {
            opt.cellRenderer = (params: { data: Torrent; value: number }) => {
              const torrent = params.data;
              return this.getTorrentProgressBar(params.value * 100, torrent);
            };
          }
          if (o.formatter_type === 'html') {
            opt.cellRenderer = (params: LabelFormatterParams) => {
              return params.value;
            };
          }

          if (o.field === 'status') {
            valueGetter = (params) => {
              const torrent: Torrent = params.data;
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
            valueGetter: valueGetter as unknown as ValueGetterFunc<Torrent>,
            hide: !enabledFieldNames.has(o.field),
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
      onRowSelected: (e) => {
        userActions.emit('selectTorrent', e.data!.id);
        this.currentTorrentId = e.data!.id;
      },
    };
    this.control.torrentList = new Grid(eGridDiv as HTMLElement, this.control.grid);
    if (stateRaw) {
      this.control.grid.columnApi?.applyColumnState({ state: JSON.parse(stateRaw) });
    }

    window.onbeforeunload = () => {
      this.setStorageData(
        this.gridState,
        JSON.stringify(this.control.grid.columnApi?.getColumnState()),
      );
    };

    console.log(this.control.grid.columnDefs);
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
  async reloadTorrentBaseInfos(ids: Array<string | number>, moreFields?: string[]) {
    throw new Error('BUG: SHOULD be override');
  }

  torrentContextMenu(params: GetContextMenuItemsParams<Torrent>): Array<string | MenuItemDef> {
    const torrent = params.node!.data as Torrent;

    const selected = this.control.grid.api?.getSelectedRows() ?? [];
    if (!selected.length) {
      selected.push(torrent);
    }

    const statusMenu = [];

    if (torrent.status === TorrentStatus.stopped) {
      statusMenu.push({
        // TODO
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
            .then(() => this.reloadTorrentBaseInfos(ids));
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
            .then(() => this.reloadTorrentBaseInfos(ids));
        },
      });
    }

    return [
      ...statusMenu,
      'separator',
      {
        name: this.lang.toolbar.tip.rename,
      },
      {
        name: this.lang.toolbar.tip.remove,
      },
      {
        name: this.lang.toolbar.tip.recheck,
      },
      'separator',
      {
        name: this.lang.toolbar.tip['more-peers'],
        action: () => {},
      },
      {
        name: this.lang.toolbar.tip['change-download-dir'],
      },
      {
        name: this.lang.toolbar.tip['copy-path-to-clipboard'],
        action: () => {
          void navigator.clipboard.writeText(torrent.downloadDir);
        },
      },
      'separator',
      {
        name: this.lang.menus.queue['move-top'],
      },
      {
        name: this.lang.menus.queue['move-up'],
      },
      {
        name: this.lang.menus.queue['move-down'],
      },
      {
        name: this.lang.menus.queue['move-bottom'],
      },
      'separator',
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

  // Gets the progress bar for the specified torrent
  getTorrentProgressBar(progress: number, torrent: Torrent): string {
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
    if (status == transmission._status.check) {
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
}
