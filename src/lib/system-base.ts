import * as lo from 'lodash-es';

import i18nManifest from '../i18n.json';
import enLocal from '../i18n/en.json';
import { type Field } from './torrent-fields';
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
  panel = null;
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
    torrentlist: null as any,
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
    } else if (key === 'auto-match-data-folder') {
      const rows = this.control.torrentlist.datagrid('getChecked');
      const ids = [];
      for (const i in rows) {
        ids.push(rows[i].id);
      }
      if (ids.length === 0) {
        return;
      }

      this.openDialogFromTemplate({
        id: 'dialog-auto-match-data-folder',
        options: {
          title: this.lang.dialog['auto-match-data-folder'].title,
          width: 530,
          height: 280,
        },
        datas: { ids },
      });
    }
  }

  saveUserConfig() {
    this.setStorageData(this.configHead, JSON.stringify(this.userConfig));
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
}
