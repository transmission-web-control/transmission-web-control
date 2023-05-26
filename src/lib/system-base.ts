import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import 'ag-grid-enterprise';
import './grid-style.css';

import { Grid, type GridOptions } from 'ag-grid-community';
import * as lo from 'lodash-es';

import i18nManifest from '../i18n.json';
import enLocal from '../i18n/en.json';
import torrentFields, { type Field } from './torrent-fields';
import { APP_VERSION } from './version';
import { formatSize } from './utils';
import { formatDuration, formatLongTime, getGrayLevel } from './formatter';
import { Torrent, transmission } from './transmission';
import { userActions } from './user-actions';

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

    $.each(items, function(key, item) {
      const name = $(item).attr('system-lang') as string;
      $(item).html(lo.get(system.lang, name) as string);
    });

    items = parent.find('*[system-tip-lang]');

    $.each(items, function(key, item) {
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
        lo.forOwn(datas, function(value, key) {
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
    const userEnabledField = (this.userConfig.torrentList.fields.length === 0 ? torrentFields.fields : this.userConfig.torrentList.fields);
    const fields = torrentFields.fields;

    const enabledFieldNames = new Set(userEnabledField.map(x => x.field));

    const stateRaw = this.getStorageData(this.gridState);

    const saveGridState = (e: any) => {
      this.setStorageData(this.gridState, JSON.stringify(this.control.grid.columnApi.getColumnState()));
    };

    this.control.grid = {
      rowHeight: 30,
      headerHeight: 30,
      columnDefs: fields.filter(o => o.field !== 'ck').map(o => {
        const formatter = this.getFieldFormat(o.formatter_type);
        return {
          headerName: this.lang.torrent.fields[o.field] as string,
          field: o.field,
          hide: !enabledFieldNames.has(o.field),
          width: o.width,
          valueFormatter: formatter ? ({ value }) => formatter(value) : undefined,
          initialWidth: o.width,
          suppressAutoSize: true,
        };
      }),
      autoSizePadding: 0,
      allowContextMenuWithControlKey: true,
      suppressContextMenu: true,
      getContextMenuItems,
      defaultColDef: {
        sortable: true,
        resizable: true,
        menuTabs: ['columnsMenuTab'],
      },
      rowSelection: 'multiple' as const,
      getRowId: (params: any) => params.data.hashString,
      onColumnResized: saveGridState,
      onColumnMoved: saveGridState,
      onGridColumnsChanged: saveGridState,
      onDisplayedColumnsChanged: saveGridState,
      onRowSelected: (e) => {
        userActions.emit('selectTorrent', e.data.id);
        this.currentTorrentId = e.data.id;
      },
    };
    this.control.torrentList = new Grid(eGridDiv as HTMLElement, this.control.grid);
    if (stateRaw) {
      this.control.grid.columnApi.applyColumnState({ state: JSON.parse(stateRaw) });
    }

    console.log(this.control.grid.columnDefs);
    // this.control.grid.api?.setHeaderHeight();

  } // end initTorrentTable

  resetTorrentListFieldsUserConfig(columns) {
    const fields = {};
    $.each(this.userConfig.torrentList.fields, function(index, item) {
      fields[item.field] = item;
    });

    this.userConfig.torrentList.fields = [];
    $.each(columns, function(index, item) {
      const field = $.extend({}, fields[item.field]);
      field.width = item.width;
      field.hidden = item.hidden;
      system.userConfig.torrentList.fields.push(field);
    });
  }

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
        return function(value: number) {
          return formatSize(value, true, 'speed');
        };
      case 'longtime':
        return function(value: string) {
          return formatLongTime(value);
        };
      case 'progress':
        return;
        field.formatter = function(value, row, index) {
          const percentDone = parseFloat(value * 100).toFixed(2);
          return system.getTorrentProgressBar(percentDone, transmission.torrents.all[row.id]);
        };
        break;

      case '_usename_':
        return;
      case 'ratio':
        return;
        field.formatter = function(value, row, index) {
          let className = '';
          if (parseFloat(value) < 1 && value != -1) {
            className = 'text-status-warning';
          }
          return '<span class="' + className + '">' + (value == -1 ? '∞' : value) + '</span>';
        };
        break;

      case 'remainingTime':
        return function(value: number) {
          if (value >= 3153600000) {
            return '∞';
          }
          return formatDuration(value);
        };
    }
  }
}


function getContextMenuItems(params): any {
  return [
    {
      // custom item
      name: 'Always Disabled',
      disabled: true,
      tooltip:
        'Very long tooltip, did I mention that I am very long, well I am! Long!  Very Long!',
    },
    {
      name: 'Person',
      subMenu: [
        {
          name: 'Niall',
          action: () => {
            console.log('Niall was pressed');
          },
        },
        {
          name: 'Sean',
          action: () => {
            console.log('Sean was pressed');
          },
        },
        {
          name: 'John',
          action: () => {
            console.log('John was pressed');
          },
        },
        {
          name: 'Alberto',
          action: () => {
            console.log('Alberto was pressed');
          },
        },
        {
          name: 'Tony',
          action: () => {
            console.log('Tony was pressed');
          },
        },
        {
          name: 'Andrew',
          action: () => {
            console.log('Andrew was pressed');
          },
        },
        {
          name: 'Kev',
          action: () => {
            console.log('Kev was pressed');
          },
        },
        {
          name: 'Will',
          action: () => {
            console.log('Will was pressed');
          },
        },
        {
          name: 'Armaan',
          action: () => {
            console.log('Armaan was pressed');
          },
        },
      ],
    }, // built in separator
    'separator',
    'separator',
    {
      // custom item
      name: 'Checked',
      checked: true,
      action: () => {
        console.log('Checked Selected');
      },
      icon:
        '<img src="https://www.ag-grid.com/example-assets/skills/mac.png"/>',
    }, // built in copy item
    'copy',
    'separator',
    'chartRange',
  ];
}
