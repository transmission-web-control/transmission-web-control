import ClipboardJS from 'clipboard';
import { Base64 } from 'js-base64';
import semver from 'semver';

import { formatDuration, formatLongTime, getGrayLevel } from './formatter.ts';
import { timedChunk } from './public.ts';
import { SystemBase, templateFiles } from './system-base';
import torrentFields from './torrent-fields.ts';
import { transmission } from './transmission';
import { arrayObjectSort, formatSize } from './utils';
import { APP_VERSION } from './version';

// Current system global object
export class System extends SystemBase {
  /**
   * 程序初始化
   */
  init(lang) {
    this.readConfig();
    this.lastUIStatus = JSON.parse(JSON.stringify(this.config.ui.status));
    this.panel = {
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

    if (!system.langInit) {
      this.setLang(lang);
      system.langInit = true;
    }

    this.initData();
    this.initThemes();
    // 剪切板组件
    this.clipboard = new ClipboardJS('#toolbar_copyPath');
  }

  initData() {
    $(document).attr('title', this.lang.system.title + ' ' + this.version);

    // 设置开关组件默认文字
    $.fn.switchbutton.defaults.onText = this.lang.public['text-on'];
    $.fn.switchbutton.defaults.offText = this.lang.public['text-off'];

    // The initial navigation bar
    const buttons = [];
    let title = '<span>' + this.lang.title.left + '</span>';
    // 暂时取消导航栏上的额外按钮
    // buttons.push("<span class='tree-title-toolbar'>");
    // for (var key in this.lang.tree.toolbar.nav) {
    // 	var value = this.lang.tree.toolbar.nav[key];
    // 	buttons.push('<a href="javascript:void(0);" id="tree-toolbar-nav-' + key + '" class="easyui-linkbutton" data-options="plain:true,iconCls:\'icon-disabled\'" onclick="javascript:system.navToolbarClick(this);">' + value + "</a>");
    // }
    // buttons.push("</span>");
    if (buttons.length > 1) {
      title += buttons.join('');
      this.panel.left_layout.panel('setTitle', title);
      for (var key in this.lang.tree.toolbar.nav) {
        $('#tree-toolbar-nav-' + key).linkbutton();
        switch (key) {
          case 'folders':
            if (system.config.foldersShow) {
              $('tree-toolbar-nav-' + key)
                .linkbutton({
                  iconCls: 'icon-enabled',
                })
                .data('status', 1);
            } else {
              $('tree-toolbar-nav-' + key)
                .linkbutton({
                  iconCls: 'icon-disabled',
                })
                .data('status', 0);
            }
            break;
          default:
            break;
        }
      }
    } else {
      this.panel.left_layout.panel('setTitle', title);
    }

    // Initialize the torrent list column title
    title = '<span>' + this.lang.title.list + '</span>';
    buttons.length = 0;
    // buttons.push("<span class='tree-title-toolbar'>");
    // for (var key in this.lang["torrent-head"].buttons) {
    // 	var value = this.lang["torrent-head"].buttons[key];
    // 	buttons.push('<a href="javascript:void(0);" id="torrent-head-buttons-' + key + '" class="easyui-linkbutton" data-options="plain:true,iconCls:\'icon-disabled\'" onclick="javascript:system.navToolbarClick(this);">' + value + "</a>");
    // }
    // buttons.push("</span>");
    if (buttons.length > 1) {
      title += buttons.join('');
      this.panel.body.panel('setTitle', title);
      for (var key in this.lang['torrent-head'].buttons) {
        $('#torrent-head-buttons-' + key).linkbutton();
        switch (key) {
          case 'autoExpandAttribute':
            if (system.config.autoExpandAttribute) {
              $('#torrent-head-buttons-' + key)
                .linkbutton({
                  iconCls: 'icon-enabled',
                })
                .data('status', 1);
            } else {
              $('#torrent-head-buttons-' + key)
                .linkbutton({
                  iconCls: 'icon-disabled',
                })
                .data('status', 0);
            }
            break;

          default:
            break;
        }
      }
    } else {
      this.panel.body.panel('setTitle', title);
    }

    this.panel.status.panel('setTitle', this.lang.title.status);
    // 设置属性栏
    this.panel.attribute.panel({
      title: this.lang.title.attribute,
      content: templateFiles[`../twc/template/torrent-attribute.html`],
      onExpand() {
        if (system.currentTorrentId != 0 && $(this).data('isload')) {
          system.getTorrentInfos(system.currentTorrentId);
        } else {
          system.clearTorrentAttribute();
        }
      },
      onLoad() {
        if (!$(this).data('isload')) {
          $(this).data('isload', true);
          if (system.currentTorrentId != 0) {
            setTimeout(function () {
              system.getTorrentInfos(system.currentTorrentId);
            }, 500);
          }
        }
      },
    });

    // Set the language
    Object.entries(this.languages).forEach(function ([key, value]) {
      $('<option/>')
        .text(value)
        .val(key)
        .attr('selected', key === system.lang.name)
        .appendTo(system.panel.top.find('#lang'));
    });

    this.panel.top.find('#lang').change(function () {
      location.href = '?lang=' + this.value;
    });

    this.panel.toolbar.attr('class', 'panel-header');
    this.initTree();
    this.initToolbar();
    this.initStatusBar();
    this.initTorrentTable();
    this.connect();
    this.initEvent();
    // Check for updates
    this.checkUpdate();
  }

  /**
   * 初始化相关事件
   */
  initEvent() {
    // When the window size changes
    $(window).resize(function () {
      $('#main').layout('resize');
    });

    // Add file drag-and-drop event handling - Begin
    this.panel.droparea[0].addEventListener(
      'dragover',
      function (e) {
        e.stopPropagation();
        e.preventDefault();
        system.debug('#dropArea.dragover');
      },
      false,
    );

    this.panel.list[0].addEventListener(
      'dragover',
      function (e) {
        e.stopPropagation();
        e.preventDefault();
        system.panel.droparea.show();
        system.debug('dragover');
      },
      false,
    );

    this.panel.droparea[0].addEventListener(
      'drop',
      function (e) {
        e.stopPropagation();
        e.preventDefault();
        system.panel.droparea.hide();
        system.debug('drop.e.dataTransfer:', e.dataTransfer);
        system.checkDropFiles(e.dataTransfer.files);
      },
      false,
    );

    this.panel.droparea[0].addEventListener(
      'dragleave',
      function (e) {
        e.stopPropagation();
        e.preventDefault();
        system.panel.droparea.hide();
        system.debug('dragleave');
      },
      false,
    );

    $('#text-drop-title').html(this.lang.public['text-drop-title']);
    // End

    // 取消选择所有已选中的种子
    $('#button-cancel-checked').on('click', function () {
      system.control.torrentlist.datagrid('uncheckAll');
    });

    // 树型目录事件
    this.panel.left.tree({
      onExpand(node) {
        system.config.ui.status.tree[node.id] = node.state;
        system.saveConfig();
      },
      onCollapse(node) {
        system.config.ui.status.tree[node.id] = node.state;
        system.saveConfig();
      },
    });

    // 设置属性栏
    this.panel.layout_body.layout({
      onExpand(region) {
        system.config.ui.status.layout.body[region] = 'open';
        system.saveConfig();
      },
      onCollapse(region) {
        system.config.ui.status.layout.body[region] = 'closed';
        system.saveConfig();
      },
    });

    this.panel.layout_left.layout({
      onExpand(region) {
        system.config.ui.status.layout.left[region] = 'open';
        system.saveConfig();
      },
      onCollapse(region) {
        system.config.ui.status.layout.left[region] = 'closed';
        system.saveConfig();
      },
    });

    this.panel.main.layout({
      onExpand(region) {
        system.config.ui.status.layout.main[region] = 'open';
        system.saveConfig();
      },
      onCollapse(region) {
        system.config.ui.status.layout.main[region] = 'closed';
        system.saveConfig();
      },
    });
  }

  layoutResize(target, size) {
    if (!system.uiIsInitialized) {
      return;
    }
    if (system.config.ui.status.size[target]) {
      system.config.ui.status.size[target] = size;
      system.saveConfig();
    }
  }

  // Navigation toolbar Click Events
  navToolbarClick(source) {
    const key = source.id;
    let status = $(source).data('status');
    let treenode = null;
    switch (key) {
      case 'tree-toolbar-nav-folders':
        treenode = this.panel.left.tree('find', 'folders');
        if (status == 1) {
          this.config.foldersShow = false;
        } else {
          this.config.foldersShow = true;
        }
        break;

      case 'tree-toolbar-nav-statistics':
        treenode = this.panel.left.tree('find', 'statistics');
        break;

      case 'torrent-head-buttons-autoExpandAttribute':
        treenode = {};
        treenode.target = null;
        if (status == 1) {
          this.config.autoExpandAttribute = false;
        } else {
          this.config.autoExpandAttribute = true;
        }
        break;
    }

    if (!treenode) {
      return;
    }

    if (status == 1) {
      $(source).linkbutton({
        iconCls: 'icon-disabled',
      });
      $(treenode.target).parent().hide();
      status = 0;
    } else {
      $(source).linkbutton({
        iconCls: 'icon-enabled',
      });
      $(treenode.target).parent().show();
      status = 1;
    }

    $(source).data('status', status);
    this.saveConfig();
  }

  // Check the dragged files
  checkDropFiles(sources) {
    if (!sources?.length) {
      return;
    }
    const files = [];
    for (let i = 0; i < sources.length; i++) {
      const file = sources[i];
      if (file.name.split('.').pop().toLowerCase() == 'torrent') {
        files.push(file);
      }
    }

    if (files.length > 0) {
      system.openDialogFromTemplate({
        id: 'dialog-torrent-addfile',
        options: {
          title: system.lang.toolbar['add-torrent'],
          width: 620,
          height: system.config.nav.labels ? 500 : 300,
          resizable: true,
        },
        datas: {
          files,
        },
      });
    }
  }

  // Initialize the tree list
  initTree() {
    const items = [
      {
        id: 'torrent-all',
        iconCls: 'iconfont tr-icon-home',
        text: this.lang.tree.all + ' (' + this.lang.tree.status.loading + ')',
        children: [
          {
            id: 'downloading',
            text: this.lang.tree.downloading,
            iconCls: 'iconfont tr-icon-download',
          },
          {
            id: 'paused',
            text: this.lang.tree.paused,
            iconCls: 'iconfont tr-icon-pause2',
          },
          {
            id: 'sending',
            text: this.lang.tree.sending,
            iconCls: 'iconfont tr-icon-upload',
          },
          {
            id: 'check',
            text: this.lang.tree.check,
            iconCls: 'iconfont tr-icon-data-check',
          },
          {
            id: 'actively',
            text: this.lang.tree.actively,
            iconCls: 'iconfont tr-icon-actively',
          },
          {
            id: 'error',
            text: this.lang.tree.error,
            iconCls: 'iconfont tr-icon-errors',
          },
          {
            id: 'warning',
            text: this.lang.tree.warning,
            iconCls: 'iconfont tr-icon-warning',
          },
        ],
      },
    ];

    const navContents = {
      servers: {
        id: 'servers',
        text: this.lang.tree.servers,
        state: 'closed',
        iconCls: 'iconfont tr-icon-servers',
        children: [
          {
            id: 'servers-loading',
            text: this.lang.tree.status.loading,
            iconCls: 'tree-loading',
          },
        ],
      },
      folders: {
        id: 'folders',
        text: this.lang.tree.folders,
        iconCls: 'iconfont tr-icon-folder',
        state: 'closed',
        children: [
          {
            id: 'folders-loading',
            text: this.lang.tree.status.loading,
            iconCls: 'tree-loading',
          },
        ],
      },
      statistics: {
        id: 'statistics',
        text: this.lang.tree.statistics.title,
        state: 'closed',
        iconCls: 'iconfont tr-icon-shuju',
        children: [
          {
            id: 'cumulative-stats',
            text: this.lang.tree.statistics.cumulative,
            iconCls: 'iconfont tr-icon-folder',
            children: [
              {
                id: 'uploadedBytes',
                text: this.lang.tree.statistics.uploadedBytes,
                iconCls: 'iconfont tr-icon-empty',
              },
              {
                id: 'downloadedBytes',
                text: this.lang.tree.statistics.downloadedBytes,
                iconCls: 'iconfont tr-icon-empty',
              },
              {
                id: 'filesAdded',
                text: this.lang.tree.statistics.filesAdded,
                iconCls: 'iconfont tr-icon-empty',
              },
              {
                id: 'sessionCount',
                text: this.lang.tree.statistics.sessionCount,
                iconCls: 'iconfont tr-icon-empty',
              },
              {
                id: 'secondsActive',
                text: this.lang.tree.statistics.secondsActive,
                iconCls: 'iconfont tr-icon-empty',
              },
            ],
          },
          {
            id: 'current-stats',
            text: this.lang.tree.statistics.current,
            iconCls: 'iconfont tr-icon-folder',
            children: [
              {
                id: 'current-uploadedBytes',
                text: this.lang.tree.statistics.uploadedBytes,
                iconCls: 'iconfont tr-icon-empty',
              },
              {
                id: 'current-downloadedBytes',
                text: this.lang.tree.statistics.downloadedBytes,
                iconCls: 'iconfont tr-icon-empty',
              },
              {
                id: 'current-filesAdded',
                text: this.lang.tree.statistics.filesAdded,
                iconCls: 'iconfont tr-icon-empty',
              },
              {
                id: 'current-sessionCount',
                text: this.lang.tree.statistics.sessionCount,
                iconCls: 'iconfont tr-icon-empty',
              },
              {
                id: 'current-secondsActive',
                text: this.lang.tree.statistics.secondsActive,
                iconCls: 'iconfont tr-icon-empty',
              },
            ],
          },
        ],
      },
      labels: {
        id: 'labels',
        text: this.lang.tree.labels,
        iconCls: 'iconfont tr-icon-labels',
      },
    };

    for (const key in this.config.nav) {
      const value = this.config.nav[key];
      const data = navContents[key];
      if (data) {
        if (value) {
          items.push(data);
        }
      }
    }

    this.panel.left.tree({
      data: items,
      onSelect(node) {
        system.loadTorrentToList({
          node,
        });
        system.currentListDir = node.downDir;
      },
      lines: true,
    });
  }

  /**
   * 初始化界面状态
   */
  initUIStatus() {
    if (this.uiIsInitialized) {
      return;
    }
    system.uiIsInitialized = true;
    let status = this.lastUIStatus.tree;
    for (var key in status) {
      const node1 = this.panel.left.tree('find', key);
      if (node1?.target) {
        if (status[key] == 'open') {
          this.panel.left.tree('expand', node1.target);
        } else {
          this.panel.left.tree('collapse', node1.target);
        }
      }
    }

    // 是否显示数据目录
    // if (!this.config.foldersShow) {
    // 	var node = this.panel.left.tree("find", "folders");
    // 	$(node.target).parent().hide();
    // }

    // node that specifies the default selection
    if (this.config.defaultSelectNode) {
      let node = this.panel.left.tree('find', this.config.defaultSelectNode);
      // 当不显示目录时，如果最后选择的为目录，则显示所有种子；
      if (node && (this.config.foldersShow || !this.config.defaultSelectNode.includes('folders'))) {
        this.panel.left.tree('select', node.target);
      } else {
        node = this.panel.left.tree('find', 'torrent-all');
        this.panel.left.tree('select', node.target);
      }
    }

    // 恢复尺寸
    if (this.lastUIStatus.size.nav?.width) {
      this.panel.main
        .layout('panel', 'west')
        .panel('resize', { width: this.lastUIStatus.size.nav.width + 5 });
      this.panel.main.layout('resize');
    }

    if (this.lastUIStatus.size.attribute?.height) {
      this.panel.layout_body
        .layout('panel', 'south')
        .panel('resize', { height: this.lastUIStatus.size.attribute.height });
      this.panel.layout_body.layout('resize');
    }

    // 恢复展开状态
    status = this.lastUIStatus.layout.body;
    for (const key in status) {
      if (status[key] === 'open') {
        this.panel.layout_body.layout('expand', key);
      } else {
        this.panel.layout_body.layout('collapse', key);
      }
    }

    status = this.lastUIStatus.layout.left;
    for (const key in status) {
      if (status[key] === 'open') {
        this.panel.layout_left.layout('expand', key);
      } else {
        this.panel.layout_left.layout('collapse', key);
      }
    }

    status = this.lastUIStatus.layout.main;
    for (const key in status) {
      if (status[key] === 'open') {
        this.panel.main.layout('expand', key);
      } else {
        this.panel.main.layout('collapse', key);
      }
    }
  }

  // Initialize the torrent list display table
  initTorrentTable() {
    const system = this;
    const torrentList = $('<table/>').attr('class', 'torrent-list').appendTo(this.panel.list);
    this.control.torrentlist = torrentList;

    let headContextMenu = null;
    let selectedIndex = -1;

    // Create a header right-click menu
    function createHeadContextMenu() {
      if (headContextMenu) {
        $(headContextMenu).remove();
      }
      headContextMenu = $('<div/>').appendTo('body');
      headContextMenu.menu({
        onClick(item) {
          if (item.iconCls == 'icon-ok') {
            system.control.torrentlist.datagrid('hideColumn', item.name);
            headContextMenu.menu('setIcon', {
              target: item.target,
              iconCls: 'icon-empty',
            });
          } else {
            system.control.torrentlist.datagrid('showColumn', item.name);
            headContextMenu.menu('setIcon', {
              target: item.target,
              iconCls: 'icon-ok',
            });
          }
          system.resetTorrentListFieldsUserConfig(
            system.control.torrentlist.datagrid('options').columns[0],
          );
          system.saveUserConfig();
        },
      });
      const fields = system.control.torrentlist.datagrid('getColumnFields');
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const col = torrentList.datagrid('getColumnOption', field);

        if (col.allowCustom?.toString() !== 'false') {
          headContextMenu.menu('appendItem', {
            text: col.title,
            name: field,
            iconCls: col.hidden ? 'icon-empty' : 'icon-ok',
          });
        }
      }
    }

    let fields = torrentFields.fields;
    const _fields = Object.fromEntries(fields.map((x) => [x.field, x]));

    if (system.userConfig.torrentList.fields.length) {
      fields = $.extend(fields, system.userConfig.torrentList.fields);
    }

    // User field settings
    system.userConfig.torrentList.fields = fields;

    for (const item of fields) {
      const _field = _fields[item.field];
      if (_field?.formatter_type) {
        item.formatter_type = _field.formatter_type;
      } else if (item.formatter_type) {
        delete item.formatter_type;
      }

      item.align = _field.align;

      if (_field?.sortable) {
        item.sortable = _field.sortable;
      } else if (item.sortable) {
        delete item.sortable;
      }

      item.title = this.lang.torrent.fields[item.field] || item.field;
      system.setFieldFormat(item);
    }

    // 初始化种子列表
    torrentList.datagrid({
      autoRowHeight: false,
      pagination: system.config.pagination,
      rownumbers: true,
      remoteSort: false,
      checkOnSelect: false,
      pageSize: system.config.pageSize,
      pageList: system.config.pageList,
      idField: 'id',
      fit: true,
      striped: true,
      sortName: system.userConfig.torrentList.sortName,
      sortOrder: system.userConfig.torrentList.sortOrder,
      drophead: true,
      columns: [fields],
      onCheck(rowIndex, rowData) {
        system.checkTorrentRow(rowIndex, rowData);
      },
      onUncheck(rowIndex, rowData) {
        system.checkTorrentRow(rowIndex, rowData);
      },
      onCheckAll(rows) {
        system.checkTorrentRow('all', false);
      },
      onUncheckAll(rows) {
        system.checkTorrentRow('all', true);
      },
      onSelect(rowIndex, rowData) {
        if (selectedIndex != -1) {
          system.control.torrentlist.datagrid('unselectRow', selectedIndex);
        }
        system.getTorrentInfos(rowData.id);
        selectedIndex = rowIndex;
      },
      onUnselect(rowIndex, rowData) {
        system.currentTorrentId = 0;
        selectedIndex = -1;
      },
      // Before loading data
      onBeforeLoad(param) {
        system.currentTorrentId = 0;
      },
      // Header sorting
      onSortColumn(field, order) {
        const field_func = field;
        const datas = system.control.torrentlist
          .datagrid('getData')
          .originalRows.sort(arrayObjectSort(field_func, order));
        system.control.torrentlist.datagrid('loadData', datas);

        system.resetTorrentListFieldsUserConfig(
          system.control.torrentlist.datagrid('options').columns[0],
        );
        system.userConfig.torrentList.sortName = field;
        system.userConfig.torrentList.sortOrder = order;
        system.saveUserConfig();
      },
      onRowContextMenu(e, rowIndex, rowData) {
        // console.log("onRowContextMenu");
        if (system.config.simpleCheckMode) {
          system.control.torrentlist.datagrid('uncheckAll');
        }

        // 当没有种子被选中时，选中当前行
        if (system.checkedRows.length == 0) {
          system.control.torrentlist.datagrid('checkRow', rowIndex);
        }
        e.preventDefault();
        system.showContextMenu('torrent-list', e);
      },
      onHeadDrop(sourceField, targetField) {
        // console.log("onHeadDrop");
        system.resetTorrentListFieldsUserConfig(
          system.control.torrentlist.datagrid('options').columns[0],
        );
        system.saveUserConfig();
      },
      onResizeColumn(field, width) {
        system.resetTorrentListFieldsUserConfig(
          system.control.torrentlist.datagrid('options').columns[0],
        );
        system.saveUserConfig();
      },
      onHeaderContextMenu(e, field) {
        // console.log("onHeaderContextMenu");
        e.preventDefault();
        if (!headContextMenu) {
          createHeadContextMenu();
        }
        headContextMenu.menu('show', {
          left: e.pageX,
          top: e.pageY,
        });
      },
    });

    // 刷新当前页数据
    torrentList.refresh = function () {
      system.control.torrentlist.datagrid('getPager').find('.pagination-load').click();
    };
  } // end initTorrentTable

  resetTorrentListFieldsUserConfig(columns) {
    const fields = {};
    $.each(this.userConfig.torrentList.fields, function (index, item) {
      fields[item.field] = item;
    });

    this.userConfig.torrentList.fields = [];
    $.each(columns, function (index, item) {
      const field = $.extend({}, fields[item.field]);
      field.width = item.width;
      field.hidden = item.hidden;
      system.userConfig.torrentList.fields.push(field);
    });
  }

  // Show context menu
  showContextMenu(type, e) {
    let parent = this.contextMenus[type];
    if (!parent) {
      parent = $('<div/>')
        .attr('class', 'easyui-menu')
        .css({
          'min-width': '180px',
        })
        .appendTo(this.panel.main);
      this.contextMenus[type] = parent;
      parent.menu();
    } else {
      parent.empty();
    }
    let menus = null;

    switch (type) {
      case 'torrent-list':
        menus = [
          'start',
          'pause',
          '-',
          'rename',
          'remove',
          'recheck',
          '-',
          'morepeers',
          'changeDownloadDir',
          'copyPath',
          '-',
          'menu-queue-move-top',
          'menu-queue-move-up',
          'menu-queue-move-down',
          'menu-queue-move-bottom',
          'magnetLink',
        ];

        // 是否显示标签菜单
        if (this.config.nav.labels) {
          menus.push('-');
          menus.push('setLabels');
        }
        var toolbar = this.panel.toolbar;
        for (const key of menus) {
          if (key === '-') {
            $("<div class='menu-sep'></div>").appendTo(parent);
            continue;
          }

          let menu = toolbar.find(`#toolbar_${key}`);
          if (menu.length > 0) {
            parent.menu('appendItem', {
              text: menu.attr('title'),
              id: key,
              iconCls: menu.linkbutton('options').iconCls,
              disabled: menu.linkbutton('options').disabled,
              onclick() {
                system.panel.toolbar.find('#toolbar_' + $(this).attr('id')).click();
              },
            });
            continue;
          }

          menu = $(`#${key}`);
          if (menu.length > 0) {
            parent.menu('appendItem', {
              text: menu.attr('title'),
              id: key,
              iconCls: menu.attr('id').replace('menu-queue-move', 'iconfont tr-icon'),
              disabled: toolbar.find('#toolbar_queue').linkbutton('options').disabled,
              onclick() {
                $('#' + $(this).attr('id')).click();
              },
            });
            continue;
          }

          menu = this.getContentMenuWithKey(key, parent);
          if (menu) {
            parent.menu('appendItem', menu);
          }
        }
        // 设置剪切板组件，因为直接调用 click 不能执行相关操作
        var btn = $('#copyPath', parent);
        btn.attr({
          'data-clipboard-action': 'copy',
          'data-clipboard-target': '#clipboard-source',
        });
        var clipboard = new ClipboardJS(btn.get(0));

        break;
    }
    parent.menu('show', {
      left: e.pageX,
      top: e.pageY,
      hideOnUnhover: false,
    });
    parent = null;
    menus = null;
  }

  /**
   * 根据指定的key获取右键菜单
   * @param key
   * @param parent 父节点
   * @return 菜单对象
   */
  getContentMenuWithKey(key, parent) {
    switch (key) {
      case 'setLabels':
        return {
          id: 'setLabels',
          text: system.lang.menus.setLabels,
          iconCls: 'iconfont tr-icon-labels',
          disabled: this.checkedRows.length == 0,
          onclick() {
            const rows = system.checkedRows;
            const values = [];
            for (const i in rows) {
              values.push(rows[i].hashString);
            }
            if (values.length == 0) {
              return;
            }

            system.openDialogFromTemplate({
              id: 'dialog-torrent-setLabels',
              options: {
                title: system.lang.dialog['torrent-setLabels'].title,
                width: 520,
                height: 200,
              },
              datas: {
                hashs: values,
              },
            });
          },
        };
      case 'magnetLink':
        return {
          id: 'magnetLink',
          text: system.lang.menus.copyMagnetLink,
          iconCls: 'iconfont tr-icon-labels',
          disabled: this.checkedRows.length == 0,
          onclick() {
            system.getTorrentMagnetLink(function (data) {
              system.copyToClipboard(data);
              parent.css('display', 'block'); // 防止第一次复制碰链失败
            });
          },
        };
    }
  }

  /**
   * 格式化指定种子的标签
   * @param ids 标签id列表, 数组
   * @param hashString 种子的hash值
   * @return 返回一组标签内容
   */
  formetTorrentLabels(ids, hashString) {
    const box = $("<div style='position: relative;'/>");
    if (ids) {
      if (typeof ids === 'string') {
        ids = ids.split(',');
      }

      for (let i = 0; i < ids.length; i++) {
        const index = ids[i];
        const item = this.config.labels[index];
        if (item) {
          $("<span class='user-label'/>")
            .html(item.name)
            .css({
              'background-color': item.color,
              color: getGrayLevel(item.color) > 0.5 ? '#000' : '#fff',
            })
            .appendTo(box);
        }
      }
    }

    const button = $(
      `<button onclick='javascript:system.setTorrentLabels(this,"${hashString}");' data-options="iconCls:'iconfont tr-icon-labels',plain:true" class="easyui-linkbutton user-label-set"/>`,
    ).appendTo(box);
    button.linkbutton();
    button.find('span').first().attr({
      title: system.lang.dialog['torrent-setLabels'].title,
    });
    return box.get(0).outerHTML;
  }

  /**
   * 快速设置当前种子标签
   */
  setTorrentLabels(button, hashString) {
    system.openDialogFromTemplate({
      id: 'dialog-torrent-setLabels',
      options: {
        title: system.lang.dialog['torrent-setLabels'].title,
        width: 520,
        height: 200,
      },
      datas: {
        hashs: [hashString],
      },
      type: 1,
      source: $(button),
    });
  }

  /**
   * 选中或反选种子时，改变菜单的可操作状态
   * @param rowIndex  当前行索引，当全选/反选时为 'all'
   * @param rowData    当前行数据，当全选/反选时为 true 或 false，全选为false, 全反选为 true
   * @return void
   */
  checkTorrentRow(rowIndex, rowData) {
    // 获取当前已选中的行
    this.checkedRows = this.control.torrentlist.datagrid('getChecked');
    this.showCheckedInStatus();
    // 是否全选或反选
    if (rowIndex == 'all') {
      if (this.control.torrentlist.datagrid('getRows').length == 0) {
        return;
      }
      $(
        '#toolbar_start, #toolbar_pause, #toolbar_remove, #toolbar_recheck, #toolbar_changeDownloadDir,#toolbar_changeSpeedLimit,#toolbar_morepeers,#toolbar_copyPath',
        this.panel.toolbar,
      ).linkbutton({
        disabled: rowData,
      });

      $('#toolbar_rename, #toolbar_morepeers', this.panel.toolbar).linkbutton({
        disabled: true,
      });
      this.panel.toolbar.find('#toolbar_queue').menubutton('disable');
      return;
    }

    // 如果没有被选中的数据时
    if (this.checkedRows.length == 0) {
      // 禁用所有菜单
      $(
        '#toolbar_start, #toolbar_pause, #toolbar_rename, #toolbar_remove, #toolbar_recheck, #toolbar_changeDownloadDir,#toolbar_changeSpeedLimit,#toolbar_morepeers,#toolbar_copyPath',
        this.panel.toolbar,
      ).linkbutton({
        disabled: true,
      });
      this.panel.toolbar.find('#toolbar_queue').menubutton('disable');

      // 当仅有一条数据被选中时
    } else if (this.checkedRows.length == 1) {
      // 设置 删除、改名、变更保存目录、移动队列功能可用
      $(
        '#toolbar_remove, #toolbar_rename, #toolbar_changeDownloadDir,#toolbar_changeSpeedLimit,#toolbar_copyPath',
        this.panel.toolbar,
      ).linkbutton({
        disabled: false,
      });
      this.panel.toolbar.find('#toolbar_queue').menubutton('enable');

      const torrent = transmission.torrents.all[rowData.id];
      // 确认当前种子状态
      switch (torrent.status) {
        // 已停止
        case transmission._status.stopped:
          this.panel.toolbar.find('#toolbar_start, #toolbar_recheck').linkbutton({
            disabled: false,
          });
          this.panel.toolbar.find('#toolbar_pause, #toolbar_morepeers').linkbutton({
            disabled: true,
          });
          break;

        // 校验
        case transmission._status.check:
        case transmission._status.checkwait:
          this.panel.toolbar
            .find('#toolbar_start, #toolbar_pause, #toolbar_recheck, #toolbar_morepeers')
            .linkbutton({
              disabled: true,
            });
          break;

        // 其他
        default:
          this.panel.toolbar.find('#toolbar_start, #toolbar_recheck').linkbutton({
            disabled: true,
          });
          this.panel.toolbar.find('#toolbar_pause, #toolbar_morepeers').linkbutton({
            disabled: false,
          });
          break;
      }

      // 多条数据被选中时
    } else {
      $(
        '#toolbar_start, #toolbar_pause, #toolbar_remove, #toolbar_recheck, #toolbar_changeDownloadDir,#toolbar_changeSpeedLimit,#toolbar_copyPath',
        this.panel.toolbar,
      ).linkbutton({
        disabled: false,
      });
      $('#toolbar_rename, #toolbar_morepeers', this.panel.toolbar).linkbutton({
        disabled: true,
      });
      this.panel.toolbar.find('#toolbar_queue').menubutton('disable');
    }
  }

  /**
   * 显示已选中的内容
   */
  showCheckedInStatus() {
    if (this.checkedRows.length > 0) {
      this.panel.status_text.empty();
      this.showStatus(undefined, 0);
      const items = [];
      const text = this.lang.system.status.checked.replace('%n', this.checkedRows.length);
      const paths = [];
      $("<div style='padding: 5px;'/>").html(text).appendTo(this.panel.status_text);
      for (let index = 0; index < this.checkedRows.length; index++) {
        const item = this.checkedRows[index];
        items.push({ value: index, text: index + 1 + '. ' + item.name });
        if ($.inArray(item.downloadDir, paths) === -1) {
          paths.push(item.downloadDir);
        }
      }
      $('<div/>').appendTo(this.panel.status_text).datalist({
        data: items,
      });

      $('.datalist>.panel-body', this.panel.status_text).css({
        border: 0,
      });
      $('#button-cancel-checked').show();
      $('#clipboard-source').val(paths.join('\n'));
    } else {
      // this.showStatus("无", 100);
      $('#button-cancel-checked').hide();
      this.panel.status_text.empty();
      $('#clipboard-source').val('');
    }
  }

  // by https://stackoverflow.com/questions/22581345/click-button-copy-to-clipboard-using-jquery?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa
  copyToClipboard(text) {
    // Create a "hidden" input
    const id = 'copy_to_clipboard_textarea';
    let aux = document.getElementById(id);
    if (!aux) {
      aux = document.createElement('textarea');
    } // <input/> 不接受换行
    aux.id = id;
    aux.style.display = 'block';
    // Assign it the value of the specified element
    aux.value = text; // <textarea/> 不能使用 setAttribute
    // Append it to the body
    document.body.appendChild(aux);
    // Highlight its content
    aux.select();
    // Copy the highlighted text
    document.execCommand('copy');
    // Remove it from the body
    aux.style.display = 'none';
  }

  // Initialize the System Toolbar
  initToolbar() {
    // refresh time
    this.panel.toolbar.find('#toolbar_label_reload_time').html(this.lang.toolbar['reload-time']);
    this.panel.toolbar
      .find('#toolbar_label_reload_time_unit')
      .html(this.lang.toolbar['reload-time-unit']);
    this.panel.toolbar.find('#toolbar_reload_time').numberspinner({
      value: this.config.reloadStep / 1000,
      min: 3,
      disabled: !this.config.autoReload,
      onChange() {
        const value = this.value;
        if ($.isNumeric(value)) {
          system.config.reloadStep = value * 1000;
          system.saveConfig();
        }
      },
    });

    // Enable / disable auto-refresh
    this.panel.toolbar
      .find('#toolbar_autoreload')
      .linkbutton({
        text: this.config.autoReload
          ? this.lang.toolbar['autoreload-enabled']
          : this.lang.toolbar['autoreload-disabled'],
        iconCls: this.config.autoReload ? 'icon-enabled' : 'icon-disabled',
      })
      .attr(
        'title',
        this.config.autoReload
          ? this.lang.toolbar.tip['autoreload-disabled']
          : this.lang.toolbar.tip['autoreload-enabled'],
      )
      .click(function () {
        if (system.config.autoReload) {
          system.config.autoReload = false;
          clearTimeout(system.autoReloadTimer);
          system.panel.toolbar.find('#toolbar_reload_time').numberspinner('disable');
        } else {
          system.config.autoReload = true;
          system.reloadData();
          system.panel.toolbar.find('#toolbar_reload_time').numberspinner('enable');
        }
        system.saveConfig();

        $(this)
          .linkbutton({
            text: system.config.autoReload
              ? system.lang.toolbar['autoreload-enabled']
              : system.lang.toolbar['autoreload-disabled'],
            iconCls: system.config.autoReload ? 'icon-enabled' : 'icon-disabled',
          })
          .attr(
            'title',
            system.config.autoReload
              ? system.lang.toolbar.tip['autoreload-disabled']
              : system.lang.toolbar.tip['autoreload-enabled'],
          );
      });

    // Add torrents
    this.panel.toolbar
      .find('#toolbar_add_torrents')
      .linkbutton({
        text: this.lang.toolbar['add-torrent'],
        disabled: false,
      })
      .attr('title', this.lang.toolbar.tip['add-torrent'])
      .click(function () {
        system.openDialogFromTemplate({
          id: 'dialog-torrent-add',
          options: {
            title: system.lang.toolbar['add-torrent'],
            width: 620,
            height: system.config.nav.labels ? 600 : 400,
            resizable: true,
          },
        });
      });

    // Start all
    this.panel.toolbar
      .find('#toolbar_start_all')
      // .linkbutton({text:this.lang.toolbar["start-all"],disabled:false})
      .linkbutton({
        disabled: false,
      })
      .attr('title', this.lang.toolbar.tip['start-all'])
      .click(function () {
        let button = $(this);
        const icon = button.linkbutton('options').iconCls;
        button.linkbutton({
          disabled: true,
          iconCls: 'icon-loading',
        });
        transmission.exec(
          {
            method: 'torrent-start',
          },
          function (data) {
            button.linkbutton({
              iconCls: icon,
              disabled: false,
            });
            button = null;
          },
        );
      });

    // Pause all
    this.panel.toolbar
      .find('#toolbar_pause_all')
      // .linkbutton({text:this.lang.toolbar["pause-all"],disabled:false})
      .linkbutton({
        disabled: false,
      })
      .attr('title', this.lang.toolbar.tip['pause-all'])
      .click(function () {
        let button = $(this);
        const icon = button.linkbutton('options').iconCls;
        button.linkbutton({
          disabled: true,
          iconCls: 'icon-loading',
        });
        transmission.exec(
          {
            method: 'torrent-stop',
          },
          function (data) {
            button.linkbutton({
              iconCls: icon,
              disabled: false,
            });
            button = null;
          },
        );
      });

    // Start Selected
    this.panel.toolbar
      .find('#toolbar_start')
      .linkbutton({
        disabled: true,
      })
      .attr('title', this.lang.toolbar.tip.start)
      .click(function () {
        system.changeSelectedTorrentStatus('start', $(this));
      });

    // Pause Selected
    this.panel.toolbar
      .find('#toolbar_pause')
      .linkbutton({
        disabled: true,
      })
      .attr('title', this.lang.toolbar.tip.pause)
      .click(function () {
        system.changeSelectedTorrentStatus('stop', $(this));
      });

    // Recalculate selected
    this.panel.toolbar
      .find('#toolbar_recheck')
      .linkbutton({
        disabled: true,
      })
      .attr('title', this.lang.toolbar.tip.recheck)
      .click(function () {
        const rows = system.control.torrentlist.datagrid('getChecked');
        if (rows.length > 0) {
          if (rows.length == 1) {
            const torrent = transmission.torrents.all[rows[0].id];
            if (torrent.percentDone > 0) {
              if (confirm(system.lang.toolbar.tip['recheck-confirm'])) {
                system.changeSelectedTorrentStatus('verify', $(this));
              }
            } else {
              system.changeSelectedTorrentStatus('verify', $(this));
            }
          } else if (confirm(system.lang.toolbar.tip['recheck-confirm'])) {
            system.changeSelectedTorrentStatus('verify', $(this));
          }
        }
      });

    // Get more peers
    this.panel.toolbar
      .find('#toolbar_morepeers')
      .linkbutton({
        disabled: true,
      })
      .click(function () {
        system.changeSelectedTorrentStatus('reannounce', $(this));
      });

    // Deletes the selected
    this.panel.toolbar
      .find('#toolbar_remove')
      .linkbutton({
        disabled: true,
      })
      .attr('title', this.lang.toolbar.tip.remove)
      .click(function () {
        const rows = system.control.torrentlist.datagrid('getChecked');
        const ids = [];
        for (const i in rows) {
          ids.push(rows[i].id);
        }
        if (ids.length == 0) {
          return;
        }

        system.openDialogFromTemplate({
          id: 'dialog-torrent-remove-confirm',
          options: {
            title: system.lang.dialog['torrent-remove'].title,
            width: 350,
            height: 150,
          },
          datas: {
            ids,
          },
        });
      });

    // Renames the selected
    this.panel.toolbar
      .find('#toolbar_rename')
      .linkbutton({
        disabled: true,
      })
      .click(function () {
        const rows = system.control.torrentlist.datagrid('getChecked');
        if (rows.length == 0) {
          return;
        }

        system.openDialogFromTemplate({
          id: 'dialog-torrent-rename',
          options: {
            title: system.lang.dialog['torrent-rename'].title,
            width: 520,
            height: 200,
            resizable: true,
          },
          datas: {
            id: rows[0].id,
          },
        });
      });

    // Modify the selected torrent data save directory
    this.panel.toolbar
      .find('#toolbar_changeDownloadDir')
      .linkbutton({
        disabled: true,
      })
      .attr('title', this.lang.toolbar.tip['change-download-dir'])
      .click(function () {
        const rows = system.control.torrentlist.datagrid('getChecked');
        const ids = [];
        for (const i in rows) {
          ids.push(rows[i].id);
        }
        if (ids.length === 0) {
          return;
        }

        system.openDialogFromTemplate({
          id: 'dialog-torrent-changeDownloadDir',
          options: {
            title: system.lang.dialog['torrent-changeDownloadDir'].title,
            width: 520,
            height: 200,
          },
          datas: {
            ids,
          },
        });
      });

    this.panel.toolbar
      .find('#toolbar_changeSpeedLimit')
      .linkbutton({
        disabled: true,
      })
      .attr('title', this.lang.toolbar.tip['change-speedlimit'])
      .click(function () {
        const rows = system.control.torrentlist.datagrid('getChecked');
        const ids = [];
        for (const i in rows) {
          ids.push(rows[i].id);
        }
        if (ids.length == 0) {
          return;
        }

        system.openDialogFromTemplate({
          id: 'dialog-torrent-changeSpeedLimit',
          options: {
            title: system.lang.dialog['torrent-changeSpeedLimit'].title,
            width: 600,
            height: 200,
            resizable: true,
          },
          datas: {
            ids,
          },
          type: 0,
        });
      });

    // Speed limit
    this.panel.toolbar
      .find('#toolbar_alt_speed')
      .linkbutton()
      .attr('title', this.lang.toolbar.tip['alt-speed'])
      .click(function () {
        const button = $(this);
        const options = button.linkbutton('options');
        let enabled = false;
        if (options.iconCls == 'iconfont tr-icon-rocket') {
          enabled = true;
        }
        transmission.exec(
          {
            method: 'session-set',
            arguments: {
              'alt-speed-enabled': enabled,
            },
          },
          function (data) {
            if (data.result == 'success') {
              system.serverConfig['alt-speed-enabled'] = enabled;
              button.linkbutton({
                iconCls: 'iconfont tr-icon-' + (enabled ? 'woniu' : 'rocket'), // "icon-alt-speed-" + enabled.toString()
              });
              if (enabled) {
                $('#status_alt_speed').show();
              } else {
                $('#status_alt_speed').hide();
              }
            }
          },
        );

        button.linkbutton({
          iconCls: 'icon-loading',
        });
      });

    // configuration
    this.panel.toolbar
      .find('#toolbar_config')
      .linkbutton()
      .attr('title', this.lang.toolbar.tip['system-config'])
      .click(function () {
        system.openDialogFromTemplate({
          id: 'dialog-system-config',
          options: {
            title: system.lang.toolbar['system-config'],
            width: 680,
            height: 500,
            resizable: true,
          },
        });
      });

    // reload
    this.panel.toolbar
      .find('#toolbar_reload')
      .linkbutton()
      .attr('title', this.lang.toolbar.tip['system-reload'])
      .click(function () {
        system.reloadData();
      });

    // search
    this.panel.toolbar.find('#toolbar_search').searchbox({
      searcher(value) {
        system.searchTorrents(value);
      },
      prompt: this.lang.toolbar['search-prompt'],
    });

    this.panel.toolbar
      .find('#toolbar_copyPath')
      .linkbutton()
      .attr('title', this.lang.toolbar.tip['copy-path-to-clipboard']);
  }

  // Initialize the status bar
  initStatusBar() {
    this.panel.statusbar
      .find('#status_title_downloadspeed')
      .html(this.lang.statusbar.downloadspeed);
    this.panel.statusbar.find('#status_title_uploadspeed').html(this.lang.statusbar.uploadspeed);
  }

  // connect to the server
  connect() {
    this.showStatus(this.lang.system.status.connect, 0);

    transmission.event.on('loaded', () => {
      system.reloadTorrentBaseInfos();
    });
    // When the total torrent number is changed, the torrent information is retrieved
    transmission.event.on('torrentCountChange', function () {
      system.reloadTorrentBaseInfos();
    });
    // When submitting an error
    transmission.event.on('error', (e) => {
      console.error(`transmission error ${e}`);
      system.reloadTorrentBaseInfos();
    });
    // Initialize the connection
    transmission.init().then(() => {
      system.reloadSession();
      system.getServerStatus();
    });
  }

  // Reload the server information
  reloadSession(isinit) {
    console.debug('system.reloadSession');
    transmission.getSession(function (result) {
      system.serverConfig = result;
      // Version Information
      $('#status_version').html(
        `Transmission ${system.lang.statusbar.version}${result.version}, RPC: ${result['rpc-version']}, WEB Control: ${APP_VERSION}`,
      );
      if (result['alt-speed-enabled'] == true) {
        system.panel.toolbar.find('#toolbar_alt_speed').linkbutton({
          iconCls: 'iconfont tr-icon-woniu',
        });
        $('#status_alt_speed').show();
      } else {
        system.panel.toolbar.find('#toolbar_alt_speed').linkbutton({
          iconCls: 'iconfont tr-icon-rocket',
        });
        $('#status_alt_speed').hide();
      }

      system.downloadDir = result['download-dir'];

      // Always push default download dir to the Dirs array
      if (transmission.downloadDirs.length === 0) {
        if (system.downloadDir) {
          transmission.downloadDirs.push(system.downloadDir);
        }
      }

      // Rpc-version version 15, no longer provide download-dir-free-space parameters, to be obtained from the new method
      if (parseInt(system.serverConfig['rpc-version']) >= 15) {
        transmission.getFreeSpace(system.downloadDir, function (datas) {
          system.serverConfig['download-dir-free-space'] = datas.arguments['size-bytes'];
          system.showFreeSpace(datas.arguments['size-bytes']);
        });
      } else {
        system.showFreeSpace(system.serverConfig['download-dir-free-space']);
      }

      if (isinit) {
        system.showStatus(system.lang.system.status.connected);
      }
    });
  }

  showFreeSpace(size) {
    let tmp = size;
    if (tmp == -1) {
      tmp = system.lang.public['text-unknown'];
    } else {
      tmp = formatSize(tmp);
    }
    $('#status_freespace').text(
      system.lang.dialog['system-config']['download-dir-free-space'] + ' ' + tmp,
    );
  }

  // Retrieve the torrent information again
  reloadTorrentBaseInfos(ids, moreFields) {
    if (this.reloading) {
      return;
    }
    clearTimeout(this.autoReloadTimer);
    this.reloading = true;
    const oldInfos = {
      trackers: transmission.trackers,
      folders: transmission.torrents.folders,
    };

    // Gets all the torrent id information
    transmission.torrents.getAllIDs(
      function (resultTorrents) {
        const ignore = [];
        for (const index in resultTorrents) {
          const item = resultTorrents[index];
          ignore.push(item.id);
        }

        // Error numbered list
        const errorIds = transmission.torrents.getErrorIds(ignore, true);

        if (errorIds.length > 0) {
          transmission.torrents.getAllIDs(function () {
            system.resetTorrentInfos(oldInfos);
          }, errorIds);
        } else {
          system.resetTorrentInfos(oldInfos);
        }
      },
      ids,
      moreFields,
    );
  }

  // refresh the tree
  resetTorrentInfos(oldInfos) {
    this.resetNavTorrentStatus();
    this.resetNavServers(oldInfos);
    this.resetNavStatistics();
    this.resetNavFolders(oldInfos);
    this.resetNavLabels();
  }

  /**
   * 重置导航栏种子状态信息
   */
  resetNavTorrentStatus() {
    const currentTorrentId = this.currentTorrentId;
    // Paused
    if (transmission.torrents.status[transmission._status.stopped]) {
      system.updateTreeNodeText(
        'paused',
        system.lang.tree.paused +
          this.showNodeMoreInfos(transmission.torrents.status[transmission._status.stopped].length),
      );
    } else {
      system.updateTreeNodeText('paused', system.lang.tree.paused);
    }

    // Seeding
    if (transmission.torrents.status[transmission._status.seed]) {
      system.updateTreeNodeText(
        'sending',
        system.lang.tree.sending +
          this.showNodeMoreInfos(transmission.torrents.status[transmission._status.seed].length),
      );
    } else {
      system.updateTreeNodeText('sending', system.lang.tree.sending);
    }
    // Waiting for seed
    if (transmission.torrents.status[transmission._status.seedwait]) {
      var node = system.panel.left.tree('find', 'sending');
      var childs = system.panel.left.tree('getChildren', node.target);
      var text =
        system.lang.tree.wait +
        this.showNodeMoreInfos(transmission.torrents.status[transmission._status.seedwait].length);
      if (childs.length > 0) {
        system.updateTreeNodeText(childs[0].id, text);
      } else {
        system.appendTreeNode(node, [
          {
            id: 'seedwait',
            text,
            iconCls: 'iconfont tr-icon-wait',
          },
        ]);
      }
    } else {
      system.removeTreeNode('seedwait');
    }

    // check
    if (transmission.torrents.status[transmission._status.check]) {
      system.updateTreeNodeText(
        'check',
        system.lang.tree.check +
          this.showNodeMoreInfos(transmission.torrents.status[transmission._status.check].length),
      );
    } else {
      system.updateTreeNodeText('check', system.lang.tree.check);
    }
    // Waiting for check
    if (transmission.torrents.status[transmission._status.checkwait]) {
      var node = system.panel.left.tree('find', 'check');
      var childs = system.panel.left.tree('getChildren', node.target);
      var text =
        system.lang.tree.wait +
        this.showNodeMoreInfos(transmission.torrents.status[transmission._status.checkwait].length);
      if (childs.length > 0) {
        system.updateTreeNodeText(childs[0].id, text);
      } else {
        system.appendTreeNode(node, [
          {
            id: 'checkwait',
            text,
            iconCls: 'iconfont tr-icon-wait',
          },
        ]);
      }
    } else {
      system.removeTreeNode('checkwait');
    }

    // downloading
    if (transmission.torrents.status[transmission._status.download]) {
      system.updateTreeNodeText(
        'downloading',
        system.lang.tree.downloading +
          this.showNodeMoreInfos(
            transmission.torrents.status[transmission._status.download].length,
          ),
      );
    } else {
      system.updateTreeNodeText('downloading', system.lang.tree.downloading);
    }
    // Waiting for download
    if (transmission.torrents.status[transmission._status.downloadwait]) {
      var node = system.panel.left.tree('find', 'downloading');
      var childs = system.panel.left.tree('getChildren', node.target);
      var text =
        system.lang.tree.wait +
        this.showNodeMoreInfos(
          transmission.torrents.status[transmission._status.downloadwait].length,
        );
      if (childs.length > 0) {
        system.updateTreeNodeText(childs[0].id, text);
      } else {
        system.appendTreeNode(node, [
          {
            id: 'downloadwait',
            text,
            iconCls: 'iconfont tr-icon-wait',
          },
        ]);
      }
    } else {
      system.removeTreeNode('downloadwait');
    }

    // Active
    system.updateTreeNodeText(
      'actively',
      system.lang.tree.actively + this.showNodeMoreInfos(transmission.torrents.actively.length),
    );
    // With error
    system.updateTreeNodeText(
      'error',
      system.lang.tree.error + this.showNodeMoreInfos(transmission.torrents.error.length),
    );
    // With warning
    system.updateTreeNodeText(
      'warning',
      system.lang.tree.warning + this.showNodeMoreInfos(transmission.torrents.warning.length),
    );

    var node = system.panel.left.tree('getSelected');
    if (node != null) {
      const p = system.control.torrentlist.datagrid('options').pageNumber;
      system.loadTorrentToList({
        node,
        page: p,
      });
    }

    if (currentTorrentId != 0) {
      system.control.torrentlist.datagrid('selectRecord', currentTorrentId);
    }

    system.reloading = false;

    if (system.config.autoReload) {
      system.autoReloadTimer = setTimeout(function () {
        system.reloadData();
      }, system.config.reloadStep);
    }

    // Total count
    system.updateTreeNodeText(
      'torrent-all',
      system.lang.tree.all +
        this.showNodeMoreInfos(transmission.torrents.count, transmission.torrents.totalSize),
    );
  }

  /**
   * 重置导航栏服务器信息
   */
  resetNavServers(oldInfos) {
    // 获取服务器分布主节点
    let serversNode = this.panel.left.tree('find', 'servers');
    if (!this.config.nav.servers) {
      if (serversNode) {
        this.panel.left.tree('remove', serversNode.target);
      }
      return;
    }

    if (serversNode) {
      var serversNode_collapsed = serversNode.state;
      this.removeTreeNode('servers-loading');
    } else {
      this.appendTreeNode(null, [
        {
          id: 'servers',
          text: this.lang.tree.servers,
          state: 'closed',
          iconCls: 'iconfont tr-icon-servers',
        },
      ]);
      serversNode = this.panel.left.tree('find', 'servers');
    }

    const datas = [];
    let BTServersNode = this.panel.left.tree('find', 'btservers');
    const BTServersNodeState = BTServersNode ? BTServersNode.state : 'close';

    // 先添加一个“BT”目录节点，用于增加BT服务器列表
    if (!BTServersNode && system.config.showBTServers) {
      this.appendTreeNode(serversNode, [
        {
          id: 'btservers',
          text: 'BT',
          state: 'open',
          iconCls: 'iconfont tr-icon-bt',
        },
      ]);
      BTServersNode = this.panel.left.tree('find', 'btservers');
    }

    // 加载服务器列表
    for (var index in transmission.trackers) {
      var tracker = transmission.trackers[index];
      if (tracker.isBT) {
        // 是否显示BT服务器
        if (!system.config.showBTServers) {
          continue;
        }
      }
      const node = system.panel.left.tree('find', tracker.nodeid);
      const text = tracker.name + this.showNodeMoreInfos(tracker.count, tracker.size);
      if (node) {
        system.updateTreeNodeText(
          tracker.nodeid,
          text,
          tracker.connected ? 'iconfont tr-icon-server' : 'iconfont tr-icon-server-error',
        );
      } else {
        system.appendTreeNode(tracker.isBT ? BTServersNode : serversNode, [
          {
            id: tracker.nodeid,
            text,
            iconCls: tracker.connected
              ? 'iconfont tr-icon-server'
              : 'iconfont tr-icon-server-error',
          },
        ]);
      }

      oldInfos.trackers[tracker.nodeid] = null;
    }
    // Collapse the node if it was before
    if (serversNode_collapsed == 'closed') {
      this.panel.left.tree('collapse', serversNode.target);
    }

    if (system.config.showBTServers && BTServersNode && BTServersNodeState == 'closed') {
      this.panel.left.tree('collapse', BTServersNode.target);
    }

    // Delete the server that no longer exists
    for (var index in oldInfos.trackers) {
      var tracker = oldInfos.trackers[index];
      if (tracker) {
        system.removeTreeNode(tracker.nodeid);
      }
    }
  }

  /**
   * 重置导航栏数据统计信息
   */
  resetNavStatistics() {
    if (!this.config.nav.statistics) {
      const node = this.panel.left.tree('find', 'statistics');
      if (node) {
        this.panel.left.tree('remove', node.target);
      }
      return;
    }
    // Statistics
    const items = 'uploadedBytes,downloadedBytes,filesAdded,sessionCount,secondsActive'.split(',');
    $.each(items, function (key, item) {
      switch (item) {
        case 'uploadedBytes':
        case 'downloadedBytes':
          system.updateTreeNodeText(
            item,
            system.lang.tree.statistics[item] +
              ' ' +
              formatSize(system.serverSessionStats['cumulative-stats'][item]),
          );
          system.updateTreeNodeText(
            'current-' + item,
            system.lang.tree.statistics[item] +
              ' ' +
              formatSize(system.serverSessionStats['current-stats'][item]),
          );
          break;
        case 'secondsActive':
          system.updateTreeNodeText(
            item,
            system.lang.tree.statistics[item] +
              ' ' +
              formatDuration(system.serverSessionStats['cumulative-stats'][item]),
          );
          system.updateTreeNodeText(
            'current-' + item,
            system.lang.tree.statistics[item] +
              ' ' +
              formatDuration(system.serverSessionStats['current-stats'][item]),
          );
          break;
        default:
          system.updateTreeNodeText(
            item,
            system.lang.tree.statistics[item] +
              ' ' +
              system.serverSessionStats['cumulative-stats'][item],
          );
          system.updateTreeNodeText(
            'current-' + item,
            system.lang.tree.statistics[item] +
              ' ' +
              system.serverSessionStats['current-stats'][item],
          );
          break;
      }
    });
  }

  /**
   * 重置导航栏数据目录信息
   */
  resetNavFolders(oldInfos) {
    if (!this.config.nav.folders) {
      this.initUIStatus();
      const node = this.panel.left.tree('find', 'folders');
      if (node) {
        this.panel.left.tree('remove', node.target);
      }
      return;
    }
    for (const index in transmission.torrents.folders) {
      const item = transmission.torrents.folders[index];
      oldInfos.folders[item.nodeid] = null;
    }

    // Loads the directory listing
    this.loadFolderList(oldInfos.folders);
  }

  /**
   * 重置导航栏用户标签信息
   */
  resetNavLabels(clear) {
    if (!this.config.nav.labels) {
      var node = this.panel.left.tree('find', 'labels');
      if (node) {
        this.panel.left.tree('remove', node.target);
      }
      return;
    }

    if (clear) {
      const items = this.panel.left.tree(
        'getChildren',
        this.panel.left.tree('find', 'labels').target,
      );
      for (var index = 0; index < items.length; index++) {
        this.panel.left.tree('remove', items[index].target);
      }
    }

    const prefix = 'label-';

    for (var index = 0; index < this.config.labels.length; index++) {
      const item = this.config.labels[index];
      const key = prefix + this.getValidTreeKey(item.name);
      var node = this.panel.left.tree('find', key);
      if (!node) {
        this.appendTreeNode('labels', [
          {
            id: key,
            text: item.name,
            labelIndex: index,
            iconCls: 'iconfont tr-icon-label',
          },
        ]);
        node = this.panel.left.tree('find', key);
        $('.tree-icon', node.target).css({
          color: item.color,
        });

        $('.tree-title', node.target)
          .addClass('user-label')
          .css({
            'background-color': item.color,
            color: getGrayLevel(item.color) > 0.5 ? '#000' : '#fff',
          });
      }
    }
  }

  // Displays the current torrent count and size
  showNodeMoreInfos(count, size) {
    let result = '';
    if (count > 0) {
      result = " <span class='nav-torrents-number'>(" + count + ')</span>';
    }
    if (size > 0) {
      result += "<span class='nav-total-size'>[" + formatSize(size) + ']</span>';
    }

    return result;
  }

  // Gets the current state of the server
  getServerStatus() {
    console.debug('system.getServerStatus');
    if (this.reloading) {
      console.debug('system.getServerStatus reloading');
      return;
    }
    clearTimeout(this.autoReloadTimer);

    this.reloading = true;
    transmission.getStatus(function (data) {
      system.reloading = false;
      // system.updateTreeNodeText("torrent-all",system.lang.tree.all+" ("+data["torrentCount"]+")");
      // system.updateTreeNodeText("paused",system.lang.tree.paused+(data["pausedTorrentCount"]==0?"":" ("+data["pausedTorrentCount"]+")"));
      // system.updateTreeNodeText("sending",system.lang.tree.sending+(data["activeTorrentCount"]==0?"":" ("+data["activeTorrentCount"]+")"));
      $('#status_downloadspeed').html(formatSize(data.downloadSpeed, false, 'speed'));
      $('#status_uploadspeed').html(formatSize(data.uploadSpeed, false, 'speed'));
      system.serverSessionStats = data;
      if (data.torrentCount === 0) {
        const serversNode = system.panel.left.tree('find', 'servers');
        if (serversNode) {
          system.panel.left.tree('remove', serversNode.target);
        }
        system.updateTreeNodeText('torrent-all', system.lang.tree.all);
      }
    });
  }

  // Displays status information
  showStatus(msg, outtime) {
    if ($('#m_status').panel('options').collapsed) {
      $('#layout_left').layout('expand', 'south');
    }
    this.panel.status_text.show();
    if (msg) {
      this.panel.status_text.html(msg);
    }
    if (outtime == 0) {
      return;
    }
    if (outtime == undefined) {
      outtime = 3000;
    }
    this.panel.status_text.fadeOut(outtime, function () {
      $('#layout_left').layout('collapse', 'south');
    });
  }

  // Updates the tree node text
  updateTreeNodeText(id, text, iconCls) {
    let node = this.panel.left.tree('find', id);
    if (node) {
      const data = {
        target: node.target,
        text,
      };

      if (iconCls != undefined) {
        data.iconCls = iconCls;
      }
      this.panel.left.tree('update', data);
    }
    node = null;
  }

  // Append tree nodes
  appendTreeNode(parentid, data) {
    let parent = null;
    if (typeof parentid === 'string') {
      parent = this.panel.left.tree('find', parentid);
    } else {
      parent = parentid;
    }

    if (parent) {
      this.panel.left.tree('append', {
        parent: parent.target,
        data,
      });
    } else {
      this.panel.left.tree('append', {
        data,
      });
    }
    parent = null;
  }

  // Remove tree nodes
  removeTreeNode(id) {
    let node = this.panel.left.tree('find', id);
    if (node) {
      this.panel.left.tree('remove', node.target);
    }
    node = null;
  }

  // Load the torrent list
  loadTorrentToList(config) {
    if (!transmission.torrents.all) {
      return;
    }
    const def = {
      node: null,
      page: 1,
    };

    jQuery.extend(def, config);
    if (!config.node) {
      return;
    }

    let torrents = null;
    const parent = this.panel.left.tree('getParent', config.node.target) || {
      id: '',
    };
    let currentNodeId = this.panel.left.data('currentNodeId');

    if (currentNodeId != config.node.id) {
      // 当切换了导航菜单时，取消选择所有内容
      this.control.torrentlist.datagrid('uncheckAll');
      this.control.torrentlist.datagrid({
        pageNumber: 1,
      });
      currentNodeId = config.node.id;
    }
    this.panel.left.data('currentNodeId', currentNodeId);

    switch (parent.id) {
      case 'servers':
      case 'btservers':
        if (config.node.id == 'btservers') {
          torrents = transmission.torrents.btItems;
        } else {
          torrents = transmission.trackers[config.node.id].torrents;
        }
        break;
      default:
        switch (config.node.id) {
          case 'torrent-all':
          case 'servers':
            torrents = transmission.torrents.all;
            break;
          case 'paused':
            torrents = transmission.torrents.status[transmission._status.stopped];
            break;
          case 'sending':
            torrents = transmission.torrents.status[transmission._status.seed];
            break;

          case 'seedwait':
            torrents = transmission.torrents.status[transmission._status.seedwait];
            break;

          case 'check':
            torrents = transmission.torrents.status[transmission._status.check];
            break;
          case 'checkwait':
            torrents = transmission.torrents.status[transmission._status.checkwait];
            break;

          case 'downloading':
            torrents = transmission.torrents.status[transmission._status.download];
            break;
          case 'downloadwait':
            torrents = transmission.torrents.status[transmission._status.downloadwait];
            break;

          case 'actively':
            torrents = transmission.torrents.actively;
            break;

          case 'error':
            torrents = transmission.torrents.error;
            break;

          case 'warning':
            torrents = transmission.torrents.warning;
            break;

          case 'search-result':
            torrents = transmission.torrents.searchResult;
            break;

          case 'btservers':
            torrents = transmission.torrents.btItems;
            break;

          default:
            // Categories
            if (config.node.id.indexOf('folders-') != -1) {
              const folder = transmission.torrents.folders[config.node.id];
              if (folder) {
                if (!this.config.hideSubfolders) {
                  torrents = folder.torrents;
                } else {
                  torrents = [];
                  for (var index = 0; index < folder.torrents.length; index++) {
                    const element = folder.torrents[index];
                    if (element.downloadDir.replace(/[\\|\/]/g, '') == config.node.path) {
                      torrents.push(element);
                    }
                  }
                }
              }
            } else if (config.node.id.indexOf('label-') != -1) {
              const labelIndex = parseInt(config.node.labelIndex);
              torrents = [];
              for (const key in transmission.torrents.all) {
                const item = transmission.torrents.all[key];
                var labels = this.config.labelMaps[item.hashString];
                if (labels && $.inArray(labelIndex, labels) != -1) {
                  torrents.push(item);
                }
              }
            }
            break;
        }
        break;
    }

    if (this.config.defaultSelectNode != config.node.id) {
      this.control.torrentlist.datagrid('loadData', []);
      this.config.defaultSelectNode = config.node.id;
      this.saveConfig();
    }

    const datas = [];
    for (var index in torrents) {
      if (!torrents[index]) {
        return;
      }
      let status = this.lang.torrent['status-text'][torrents[index].status];
      // var percentDone = parseFloat(torrents[index].percentDone * 100).toFixed(2);
      // // Checksum, the use of verification progress
      // if (status == transmission._status.check) {
      // 	percentDone = parseFloat(torrents[index].recheckProgress * 100).toFixed(2);
      // }

      if (torrents[index].error != 0) {
        status = "<span class='text-status-error'>" + status + '</span>';
      } else if (torrents[index].warning) {
        status =
          "<span class='text-status-warning' title='" +
          torrents[index].warning +
          "'>" +
          status +
          '</span>';
      }
      let data = {};
      data = $.extend(data, torrents[index]);
      data.status = status;
      data.statusCode = torrents[index].status;
      data.completeSize = Math.max(0, torrents[index].totalSize - torrents[index].leftUntilDone);
      data.leecherCount = torrents[index].leecher;
      data.seederCount = torrents[index].seeder;
      var labels = this.config.labelMaps[data.hashString];
      if (labels) {
        data.labels = labels;
      }

      // data.leecherCount = torrents[index].leecher;
      /*
      datas.push({
        id:torrents[index].id
        ,name:torrents[index].name
        ,totalSize:torrents[index].totalSize
        ,percentDone:torrents[index].percentDone
        ,remainingTime:torrents[index].remainingTime
        ,status:status
        ,statusCode:torrents[index].status
        ,addedDate:torrents[index].addedDate
        ,completeSize:(torrents[index].totalSize-torrents[index].leftUntilDone)
        ,rateDownload:torrents[index].rateDownload
        ,rateUpload:torrents[index].rateUpload
        ,leecherCount:torrents[index].leecher
        ,seederCount:torrents[index].seeder
        ,uploadRatio:torrents[index].uploadRatio
        ,uploadedEver:torrents[index].uploadedEver
      });
      */

      datas.push(data);
    }
    /*
    this.panel.toolbar.find("#toolbar_start").linkbutton({disabled:true});
    this.panel.toolbar.find("#toolbar_pause").linkbutton({disabled:true});
    this.panel.toolbar.find("#toolbar_remove").linkbutton({disabled:true});
    this.panel.toolbar.find("#toolbar_recheck").linkbutton({disabled:true});
    this.panel.toolbar.find("#toolbar_changeDownloadDir").linkbutton({disabled:true});
    this.panel.toolbar.find("#toolbar_morepeers").linkbutton({disabled:true});
    this.panel.toolbar.find("#toolbar_queue").menubutton("disable");
    */

    this.updateTorrentCurrentPageDatas(datas);
    this.initShiftCheck();
  }

  /**
   * shift 键选择
   */
  initShiftCheck() {
    const items = $('#m_list div.datagrid-cell-check input:checkbox');
    const eventName = 'click.Shift';
    items.off(eventName);
    let lastChecked = null;
    const torrentlist = this.control.torrentlist;
    items.on(eventName, function (e) {
      if (!lastChecked) {
        lastChecked = this;
        return;
      }

      if (e.shiftKey) {
        const start = items.index(this);
        const end = items.index(lastChecked);
        const checked = lastChecked.checked;
        const startIndex = Math.min(start, end);
        const endIndex = Math.max(start, end) + 1;
        for (let index = startIndex; index < endIndex; index++) {
          if (checked) {
            torrentlist.datagrid('checkRow', index);
          } else {
            torrentlist.datagrid('uncheckRow', index);
          }
        }
      }

      lastChecked = this;
    });
  }

  // Update torrent list current page data
  updateTorrentCurrentPageDatas(currentTypeDatas) {
    // Get the current page data
    let rows = this.control.torrentlist.datagrid('getRows');

    if (currentTypeDatas.length == 0 && rows.length > 0) {
      this.control.torrentlist.datagrid('loadData', []);
      return;
    }

    const _options = this.control.torrentlist.datagrid('options');
    let orderField = null;
    if (_options.sortName) {
      orderField = _options.sortName;
      const orderField_func = orderField;
      currentTypeDatas = currentTypeDatas.sort(
        arrayObjectSort(orderField_func, _options.sortOrder),
      );
    }

    if (
      rows.length == 0 ||
      (currentTypeDatas.length != this.control.torrentlist.datagrid('getData').total &&
        currentTypeDatas.length > _options.pageSize)
    ) {
      this.control.torrentlist
        .datagrid({
          loadFilter: pagerFilter,
          pageNumber: _options.pageNumber,
          sortName: orderField,
          sortOrder: _options.sortOrder,
        })
        .datagrid('loadData', currentTypeDatas);
      return;
    }

    // Setting data
    this.control.torrentlist.datagrid('getData').originalRows = currentTypeDatas;
    const start = (_options.pageNumber - 1) * parseInt(_options.pageSize);
    const end = start + parseInt(_options.pageSize);
    currentTypeDatas = currentTypeDatas.slice(start, end);

    // this.debug("currentTypeDatas:",currentTypeDatas);

    // Current updated torrent list
    let recently = {};
    //
    let datas = {};

    // Initializes the most recently updated data
    for (var index in transmission.torrents.recently) {
      var item = transmission.torrents.recently[index];
      recently[item.id] = true;
      item = null;
    }

    // Initializes the data under the current type
    for (var index in currentTypeDatas) {
      var item = currentTypeDatas[index];
      datas[item.id] = item;
      item = null;
    }

    // this.debug("datas:",datas);
    // this.debug("recently:",recently);
    // this.debug("rows:",rows);

    const addedDatas = {};
    // Update the changed data
    for (var index = rows.length - 1; index >= 0; index--) {
      var item = rows[index];
      let data = datas[item.id];
      if (!data) {
        this.control.torrentlist.datagrid('deleteRow', index);
      } else if (recently[item.id]) {
        this.control.torrentlist.datagrid('updateRow', {
          index,
          row: data,
        });
        addedDatas[item.id] = item;
      }
      // Removes the currently deleted torrent
      else if (transmission.torrents.removed) {
        if (
          transmission.torrents.removed.length > 0 &&
          $.inArray(item.id, transmission.torrents.removed) != -1
        ) {
          this.control.torrentlist.datagrid('deleteRow', index);
        } else {
          addedDatas[item.id] = item;
        }
      } else {
        addedDatas[item.id] = item;
      }
      item = null;
      data = null;
    }

    // Appends a row that does not currently exist
    for (var index in currentTypeDatas) {
      var item = currentTypeDatas[index];
      if (!addedDatas[item.id]) {
        this.control.torrentlist.datagrid('appendRow', item);
      }
    }

    rows = null;
    recently = null;
    datas = null;
  }

  // Gets the contents of the torrent name display area
  getTorrentNameBar(torrent) {
    let className = '';
    let tip = torrent.name;
    switch (torrent.status) {
      case transmission._status.stopped:
        className = 'iconlabel icon-pause-small';
        break;

      case transmission._status.check:
        className = 'iconlabel icon-checking';
        break;

      case transmission._status.download:
        className = 'iconlabel icon-down';
        break;

      case transmission._status.seed:
        className = 'iconlabel icon-up';
        break;

      case transmission._status.seedwait:
      case transmission._status.downloadwait:
      case transmission._status.checkwait:
        className = 'iconlabel icon-wait';
        break;
    }

    tip += '\n' + torrent.downloadDir;

    if (torrent.warning) {
      className = 'iconlabel icon-warning-type1';
      tip += '\n\n' + this.lang.public['text-info'] + ': ' + torrent.warning;
    }

    if (torrent.error != 0) {
      className = 'iconlabel icon-exclamation';
      tip += '\n\n' + this.lang.public['text-info'] + ': ' + torrent.errorString;
    }

    return '<span class="' + className + '" title="' + tip + '">' + torrent.name + '</span>';
  }

  // Gets the progress bar for the specified torrent
  getTorrentProgressBar(progress, torrent) {
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
      const percentCheckText = parseFloat(torrent.recheckProgress * 100).toFixed(2);
      const percentCheckView = parseFloat(progress * torrent.recheckProgress).toFixed(2);
      return (
        '<div class="torrent-progress" title="' +
        progress +
        '%">' +
        '<div class="torrent-progress-text" style="z-index:2;">' +
        percentCheckText +
        '%</div>' +
        '<div class="torrent-progress-bar torrent-progress-seed" style="width:' +
        percentCheckView +
        '%;z-index:1;opacity:0.7;"></div>' +
        '<div class="torrent-progress-bar ' +
        className +
        '" style="width:' +
        progress +
        '%;"></div>' +
        '</div>'
      );
    }
    progress = progress + '%';
    return (
      '<div class="torrent-progress" title="' +
      progress +
      '"><div class="torrent-progress-text">' +
      progress +
      '</div><div class="torrent-progress-bar ' +
      className +
      '" style="width:' +
      progress +
      ';"></div></div>'
    );
  }

  // Add torrent
  addTorrentsToServer(urls, count, autostart, savepath, labels) {
    // this.config.autoReload = false;
    const index = count - urls.length;
    const url = urls.shift();
    if (!url) {
      this.showStatus(this.lang.system.status.queuefinish);
      // this.config.autoReload = true;
      this.getServerStatus();
      if (labels != null) {
        this.saveConfig();
      }
      return;
    }
    this.showStatus(this.lang.system.status.queue + (index + 1) + '/' + count + '<br/>' + url, 0);
    const system = this;
    transmission.addTorrentFromUrl(url, savepath, autostart, function (data) {
      system.addTorrentsToServer(urls, count, autostart, savepath, labels);
      if (labels != null && data.hashString != null) {
        system.saveLabelsConfig(data.hashString, labels);
      }
    });
  }

  // Starts / pauses the selected torrent
  changeSelectedTorrentStatus(status, button, method) {
    const rows = this.control.torrentlist.datagrid('getChecked');
    const ids = [];
    if (!status) {
      status = 'start';
    }
    for (const i in rows) {
      ids.push(rows[i].id);
    }

    if (!method) {
      method = 'torrent-' + status;
    }
    if (ids.length > 0) {
      if (button) {
        var icon = button.linkbutton('options').iconCls;
        button.linkbutton({
          disabled: true,
          iconCls: 'icon-loading',
        });
      }
      const system = this;
      transmission.exec(
        {
          method,
          arguments: {
            ids,
          },
        },
        function (data) {
          if (button) {
            button.linkbutton({
              iconCls: icon,
            });
          }
          system.control.torrentlist.datagrid('uncheckAll');
          system.reloadTorrentBaseInfos();
        },
      );
    }
  }

  // get the magnetlink of torrent
  getTorrentMagnetLink(callback) {
    const rows = this.control.torrentlist.datagrid('getChecked');
    const ids = [];
    for (const i in rows) {
      ids.push(rows[i].id);
    }
    transmission.torrents.getMagnetLink(ids, callback);
  }

  // Looks for the specified torrent from the torrent list
  searchTorrents(key) {
    if (key == '') {
      return;
    }
    const result = transmission.torrents.search(key);
    if (result == null || result.length == 0) {
      this.removeTreeNode('search-result');
      return;
    }

    let node = this.panel.left.tree('find', 'search-result');
    const text = this.lang.tree['search-result'] + ' : ' + key + ' (' + result.length + ')';
    if (node == null) {
      this.appendTreeNode('torrent-all', [
        {
          id: 'search-result',
          text,
          iconCls: 'iconfont tr-icon-search',
        },
      ]);
      node = this.panel.left.tree('find', 'search-result');
    } else {
      this.panel.left.tree('update', {
        target: node.target,
        text,
      });
    }
    this.panel.left.tree('select', node.target);
  }

  // Get the torrent details
  getTorrentInfos(id) {
    if (!transmission.torrents.all[id]) {
      return;
    }
    if (transmission.torrents.all[id].infoIsLoading) {
      return;
    }
    if (this.currentTorrentId > 0 && transmission.torrents.all[this.currentTorrentId]) {
      if (transmission.torrents.all[this.currentTorrentId].infoIsLoading) {
        return;
      }
    }
    this.currentTorrentId = id;
    // Loads only when expanded
    if (!this.panel.attribute.panel('options').collapsed) {
      // this.panel.attribute.panel({iconCls:"icon-loading"});
      const torrent = transmission.torrents.all[id];
      torrent.infoIsLoading = true;
      let fields =
        'fileStats,trackerStats,peers,leftUntilDone,status,rateDownload,rateUpload,uploadedEver,uploadRatio,error,errorString,pieces,pieceCount,pieceSize';
      // If this is the first time to load this torrent information, load more information
      if (!torrent.moreInfosTag) {
        fields += ',files,trackers,comment,dateCreated,creator,downloadDir';
      }

      // Gets the list of files
      transmission.torrents.getMoreInfos(fields, id, (result) => {
        torrent.infoIsLoading = false;
        // system.panel.attribute.panel({iconCls:""});
        if (result == null) {
          return;
        }
        // Merge the currently returned value to the current torrent
        jQuery.extend(torrent, result[0]);
        if (system.currentTorrentId === 0 || this.currentTorrentId !== id) {
          this.clearTorrentAttribute();
          return;
        }

        torrent.completeSize = torrent.totalSize - torrent.leftUntilDone;
        if ('files' in torrent && torrent.files.length > 0) {
          torrent.moreInfosTag = true;
        }
        this.fillTorrentBaseInfos(torrent);
        this.fillTorrentFileList(torrent);
        this.fillTorrentServerList(torrent);
        this.fillTorrentPeersList(torrent);
        this.fillTorrentConfig(torrent);
        transmission.torrents.all[id] = torrent;
        transmission.torrents.datas[id] = torrent;
      });
    }
  }

  clearTorrentAttribute() {
    this.panel.attribute.find('#torrent-files-table').datagrid('loadData', []);
    this.panel.attribute.find('#torrent-servers-table').datagrid('loadData', []);
    this.panel.attribute.find('#torrent-peers-table').datagrid('loadData', []);
    this.panel.attribute.find("span[id*='torrent-attribute-value']").html('');
  }

  // Updates the specified current page count
  updateCurrentPageDatas(keyField, datas, sourceTable) {
    // Get the current page data
    const rows = sourceTable.datagrid('getRows');
    const _options = sourceTable.datagrid('options');
    let orderField = null;
    if (_options.sortName) {
      orderField = _options.sortName;
      datas = datas.sort(arrayObjectSort(orderField, _options.sortOrder));
    }

    const isFileTable = sourceTable.selector.indexOf('#torrent-files-table') != -1;
    const tableData = sourceTable.datagrid('getData');
    const isFileFilterMode =
      isFileTable && !!tableData.filterString && tableData.torrentId == system.currentTorrentId;
    if (isFileFilterMode) {
      datas = fileFilter(datas, tableData.filterString);
    }

    if (!isFileFilterMode && (rows.length == 0 || datas.length != tableData.total)) {
      sourceTable
        .datagrid({
          loadFilter: pagerFilter,
          pageNumber: 1,
          sortName: orderField,
          sortOrder: _options.sortOrder,
        })
        .datagrid('loadData', datas);
      return;
    }

    // Setting data
    sourceTable.datagrid('getData').originalRows = datas;
    const start = (_options.pageNumber - 1) * parseInt(_options.pageSize);
    const end = start + parseInt(_options.pageSize);
    datas = datas.slice(start, end);

    const newDatas = {};
    // Initializes the data under the current type
    for (var index in datas) {
      var item = datas[index];
      newDatas[item[keyField]] = item;
      item = null;
    }

    // Update the changed data
    for (var index = rows.length - 1; index >= 0; index--) {
      var item = rows[index];

      let data = newDatas[item[keyField]];

      if (data) {
        sourceTable.datagrid('updateRow', {
          index,
          row: data,
        });
      } else {
        sourceTable.datagrid('deleteRow', index);
      }
      data = null;

      item = null;
    }
  }

  // Fill the seed with basic information
  fillTorrentBaseInfos(torrent) {
    $.each(torrent, function (key, value) {
      switch (key) {
        // Speed
        case 'rateDownload':
        case 'rateUpload':
          value = formatSize(value, true, 'speed');
          break;

        // Size
        case 'totalSize':
        case 'uploadedEver':
        case 'leftUntilDone':
        case 'completeSize':
          value = formatSize(value);
          break;

        // Dates
        case 'addedDate':
        case 'dateCreated':
        case 'doneDate':
          value = formatLongTime(value);
          break;

        // status
        case 'status':
          value = system.lang.torrent['status-text'][value];
          break;
        // error
        case 'error':
          if (value.toString() === '0') {
            system.panel.attribute.find('#torrent-attribute-tr-error').hide();
          } else {
            system.panel.attribute.find('#torrent-attribute-tr-error').show();
          }
          break;

        case 'remainingTime':
          if (value >= 3153600000000) {
            value = '∞';
          } else {
            value = formatDuration(value);
          }

          break;

        // description
        case 'comment':
          value = system.replaceURI(value);
          break;
      }
      system.panel.attribute.find('#torrent-attribute-value-' + key).html(value);
    });
    const pieces = Base64.toUint8Array(torrent.pieces);
    var piece = 0;
    const pieceCount = torrent.pieceCount;
    const pieceSize = torrent.pieceSize;
    const piecesFlag = []; // inverted
    for (const byte of pieces) {
      if (piece >= pieceCount) {
        break;
      }
      for (let i = 0; i < 3; i++) {
        for (let test = 0x80; test > 0 && piece < pieceCount; test = test >> 1, ++piece) {
          piecesFlag.push(!(byte & test));
        }
      }
    }
    const MAXCELLS = 500;

    const piecePerCell = parseInt((MAXCELLS - 1 + pieceCount) / MAXCELLS);
    const cellSize = formatSize(pieceSize * piecePerCell);
    const cellCount = parseInt((piecePerCell - 1 + pieceCount) / piecePerCell);
    var cell = 0;
    let cells = '';
    for (var cell = 0, piece = 0; cell < cellCount; ++cell) {
      let done = piecePerCell;
      for (let i = 0; i < piecePerCell; ++i, ++piece) {
        if (piecesFlag[piece]) {
          --done;
        }
      }
      const percent = parseInt((done * 100) / piecePerCell);
      const rate = percent / 100;
      const ramp = parseInt(((Math.pow(128, rate) - 1) * 100) / 127) / 100;
      cells +=
        '<i style="filter:saturate(' + ramp + ')" title="' + cellSize + ' x ' + percent + '%"></i>';
    }
    system.panel.attribute.find('#torrent-attribute-pieces').html(cells);
  }

  // Fill the torrent with a list of files
  fillTorrentFileList(torrent) {
    const files = torrent.files;
    const fileStats = torrent.fileStats;
    const datas = [];
    const namelength = torrent.name.length + 1;
    for (const index in files) {
      const file = files[index];
      const stats = fileStats[index];
      const percentDone = parseFloat((stats.bytesCompleted / file.length) * 100).toFixed(2);
      datas.push({
        name: file.name == torrent.name ? file.name : file.name.slice(namelength),
        index,
        bytesCompleted: formatSize(stats.bytesCompleted, true, 'size'),
        percentDone: system.getTorrentProgressBar(percentDone, transmission._status.download),
        length: formatSize(file.length, true, 'size'),
        wanted: system.lang.torrent.attribute.status[stats.wanted],
        priority:
          '<span class="iconlabel icon-flag-' +
          stats.priority +
          '">' +
          system.lang.torrent.attribute.priority[stats.priority] +
          '</span>',
      });
    }

    this.updateCurrentPageDatas(
      'index',
      datas,
      system.panel.attribute.find('#torrent-files-table'),
    );
  }

  // Fill in the torrent server list
  fillTorrentServerList(torrent) {
    const trackerStats = torrent.trackerStats;
    const datas = [];
    for (const index in trackerStats) {
      const stats = trackerStats[index];
      const rowdata = {};
      for (const key in stats) {
        switch (key) {
          case 'downloadCount':
          case 'leecherCount':
          case 'seederCount':
            rowdata[key] = stats[key] == -1 ? system.lang.public['text-unknown'] : stats[key];
            break;

          // state
          case 'announceState':
            rowdata[key] =
              system.lang.torrent.attribute['servers-fields'].announceStateText[stats[key]];
            break;
          // Dates
          case 'lastAnnounceTime':
          case 'nextAnnounceTime':
            rowdata[key] = formatLongTime(stats[key]);
            break;

          // true/false
          case 'lastAnnounceSucceeded':
          case 'lastAnnounceTimedOut':
            rowdata[key] = system.lang.torrent.attribute.status[stats[key]];
            break;

          default:
            rowdata[key] = stats[key];
            break;
        }
      }

      datas.push(rowdata);
    }
    // Replace the tracker information
    transmission.torrents.addTracker(torrent);

    this.updateCurrentPageDatas('id', datas, system.panel.attribute.find('#torrent-servers-table'));
    // console.log("datas:",datas);
    // system.panel.attribute.find("#torrent-servers-table").datagrid({loadFilter:pagerFilter,pageNumber:1}).datagrid("loadData",datas);
  }

  // Fill the torrent user list
  fillTorrentPeersList(torrent) {
    const peers = torrent.peers;
    const datas = [];

    for (const index in peers) {
      const item = peers[index];
      const rowdata = {};
      for (const key in item) {
        rowdata[key] = item[key];
      }
      rowdata.rateToClient = formatSize(rowdata.rateToClient, true, 'speed');
      rowdata.rateToPeer = formatSize(rowdata.rateToPeer, true, 'speed');

      if (system.config.ipInfoToken !== '' || system.config.ipInfoFlagUrl !== '') {
        let flag = '';
        let detail = '';
        const ip = rowdata.address;

        if (system.config.ipInfoDetailUrl !== '') {
          if (this.ipdetail[ip] === undefined) {
            $.ajax({
              type: 'GET',
              url: this.expandIpInfoUrl(system.config.ipInfoDetailUrl, ip),
            }).done((data) => {
              if (data) {
                detail = data.trim();
                this.ipdetail[ip] = detail;
              }
            });
          } else {
            detail = this.ipdetail[ip];
          }
        }

        if (this.flags[ip] === undefined) {
          let url = '';
          if (system.config.ipInfoFlagUrl !== '') {
            url = this.expandIpInfoUrl(system.config.ipInfoFlagUrl, ip);
          } else {
            url = 'https://ipinfo.io/' + ip + '/country?token=' + system.config.ipInfoToken;
          }
          $.ajax({
            type: 'GET',
            url,
          }).done((data) => {
            if (data) {
              flag = data.toLowerCase().trim();
              this.flags[ip] = flag;
              $('img.img_ip-' + ip.replaceAll(/[:.]+/g, '_'))
                .attr({
                  src: this.rootPath + 'style/flags/' + flag + '.png',
                  alt: flag,
                  title: detail !== '' ? detail : flag,
                })
                .show();
            }
          });
        } else {
          flag = this.flags[ip];
        }

        let img = '';
        if (flag) {
          img =
            '<img src="' +
            this.rootPath +
            'style/flags/' +
            flag +
            '.png" alt="' +
            flag +
            '" title="' +
            (detail !== '' ? detail : flag) +
            '"> ';
        } else {
          img =
            '<img src="" class="img_ip-' +
            ip.replaceAll(/[:.]+/g, '_') +
            '" style="display:none;"> ';
        }
        rowdata.address = img + ip;
      }

      // 使用同类已有的翻译文本
      rowdata.isUTP = system.lang.torrent.attribute.status[item.isUTP];
      const percentDone = parseFloat(item.progress * 100).toFixed(2);
      rowdata.progress = system.getTorrentProgressBar(percentDone, transmission._status.download);
      datas.push(rowdata);
    }

    this.updateCurrentPageDatas(
      'address',
      datas,
      system.panel.attribute.find('#torrent-peers-table'),
    );
    // console.log("datas:",datas);
    // system.panel.attribute.find("#torrent-peers-table").datagrid({loadFilter:pagerFilter,pageNumber:1}).datagrid("loadData",datas);
  }

  // Fill torrent parameters
  fillTorrentConfig(torrent) {
    if (system.panel.attribute.find('#torrent-attribute-tabs').data('selectedIndex') != 4) {
      return;
    }
    transmission.torrents.getConfig(torrent.id, function (result) {
      if (result == null) {
        return;
      }

      const torrent = transmission.torrents.all[system.currentTorrentId];
      // Merge the currently returned value to the current torrent
      jQuery.extend(torrent, result[0]);
      if (system.currentTorrentId == 0) {
        return;
      }
      $.each(result[0], function (key, value) {
        let indeterminate = false;
        let checked = false;
        let useTag = false;
        switch (key) {
          //
          case 'seedIdleMode':
          case 'seedRatioMode':
            if (value == 0) {
              checked = false;
              indeterminate = true;
            }
            useTag = true;
          case 'downloadLimited':
          case 'uploadLimited':
            if (value == true || value == 1) {
              checked = true;
            }

            system.panel.attribute
              .find("input[enabledof='" + key + "']")
              .prop('disabled', !checked);
            if (useTag) {
              system.panel.attribute
                .find('#' + key)
                .prop('indeterminate', indeterminate)
                .data('_tag', value);
            }
            system.panel.attribute.find('#' + key).prop('checked', checked);

            break;

          default:
            system.panel.attribute.find('#' + key).val(value);
            system.panel.attribute.find('#' + key).numberspinner('setValue', value);
            break;
        }
      });
    });
  }

  // Set the field display format
  setFieldFormat(field) {
    if (!field.formatter_type) {
      field.formatter = (v) => v?.toString();
      return;
    }

    switch (field.formatter_type) {
      case 'size':
        field.formatter = function (value, row, index) {
          return formatSize(value);
        };
        break;
      case 'speed':
        field.formatter = function (value, row, index) {
          return formatSize(value, true, 'speed');
        };
        break;

      case 'longtime':
        field.formatter = function (value, row, index) {
          return formatLongTime(value);
        };
        break;

      case 'progress':
        field.formatter = function (value, row, index) {
          const percentDone = parseFloat(value * 100).toFixed(2);
          return system.getTorrentProgressBar(percentDone, transmission.torrents.all[row.id]);
        };
        break;

      case '_usename_':
        switch (field.field) {
          case 'name':
            field.formatter = function (value, row, index) {
              return system.getTorrentNameBar(transmission.torrents.all[row.id]);
            };
            break;
        }
        break;
      case 'ratio':
        field.formatter = function (value, row, index) {
          let className = '';
          if (parseFloat(value) < 1 && value != -1) {
            className = 'text-status-warning';
          }
          return '<span class="' + className + '">' + (value == -1 ? '∞' : value) + '</span>';
        };
        break;

      case 'remainingTime':
        field.formatter = function (value, row, index) {
          if (value >= 3153600000) {
            return '∞';
          }
          return formatDuration(value);
        };
        break;

      case 'labels':
        field.formatter = function (value, row, index) {
          return system.formetTorrentLabels(value, row.hashString);
        };
        break;

      case 'color':
        field.formatter = function (value, row, index) {
          const box = $("<span class='user-label'/>")
            .html(value)
            .css({
              'background-color': value,
              color: getGrayLevel(value) > 0.5 ? '#000' : '#fff',
            });
          return box.get(0).outerHTML;
        };
        break;
    }
  }

  // Reload the data
  reloadData() {
    if (this.popoverCount > 0) {
      setTimeout(function () {
        system.reloadData();
      }, 2000);
      return;
    }
    this.reloadSession();
    this.reloading = false;
    this.getServerStatus();
    this.reloading = false;
    this.reloadTorrentBaseInfos();
    // enable all icons
    // this.checkTorrentRow("all", false);
  }

  // Loads the directory listing
  loadFolderList(oldFolders) {
    this.removeTreeNode('folders-loading');
    // Delete the directory that does not exist
    for (const index in oldFolders) {
      const item = oldFolders[index];
      if (item) {
        system.removeTreeNode(item.nodeid);
      }
    }
    if (transmission.downloadDirs.length === 0) {
      return;
    }

    timedChunk(
      {
        items: transmission.downloadDirs,
        process: this.appendFolder,
        context: this,
        delay: 10,
      },
      () => {
        system.initUIStatus();
      },
    );
    /*
    for (var index in transmission.downloadDirs)
    {
      var parentkey = rootkey;
      var fullkey = transmission.downloadDirs[index];

    } */
  }

  appendFolder(fullkey) {
    if (!fullkey) {
      return;
    }

    const rootkey = 'folders';
    let parentkey = rootkey;
    const folder = fullkey.replace(/\\/g, '/').split('/');
    let key = rootkey + '-';
    let path = '';
    for (const i in folder) {
      const name = folder[i];
      if (name == '') {
        continue;
      }
      // key += "--" + text.replace(/\./g,"。") + "--";
      path += name;
      const _key = Base64.encode(name);
      key += _key.replace(/[+|\/|=]/g, '0');
      let node = this.panel.left.tree('find', key);
      const folderinfos = transmission.torrents.folders[key];
      if (folderinfos) {
        const text = name + this.showNodeMoreInfos(folderinfos.count, folderinfos.size);

        if (!node) {
          this.appendTreeNode(parentkey, [
            {
              id: key,
              path,
              downDir: fullkey,
              text,
              iconCls: 'iconfont tr-icon-file',
            },
          ]);
          if (parentkey != rootkey) {
            node = this.panel.left.tree('find', parentkey);
            this.panel.left.tree('collapse', node.target);
          }
        } else {
          this.updateTreeNodeText(key, text);
        }
        parentkey = key;
      } else {
        this.debug('appendFolder:key', key);
        this.debug('appendFolder:name', name);
        this.debug('appendFolder:node', node);
      }
    }
  }

  replaceURI(text) {
    const reg = /(http|https|ftp):\/\/([^/:]+)(:\d*)?([^# ]*)/gi;
    return text.replace(reg, function (url) {
      return '<a href="' + url + '" target="_blank">' + url + '</a>';
    });
  }

  // Load the parameters from cookies
  readConfig() {
    this.readUserConfig();
    // 将原来的cookies的方式改为本地存储的方式
    const config = this.getStorageData(this.configHead + '.system');
    if (config) {
      this.config = $.extend(true, this.config, JSON.parse(config));
    }

    for (const key in this.storageKeys.dictionary) {
      this.dictionary[key] = this.getStorageData(this.storageKeys.dictionary[key]);
    }
  }

  // Save labels config for torrent if need
  saveLabelsConfig(hash, labels) {
    if (system.config.nav.labels) {
      if (labels.length == 0) {
        delete system.config.labelMaps[hash];
      } else {
        system.config.labelMaps[hash] = labels;
      }
    }
  }

  readUserConfig() {
    const local = window.localStorage[this.configHead];
    if (local) {
      const localOptions = JSON.parse(local);
      this.userConfig = $.extend(true, this.userConfig, localOptions);
    }
  }

  // Upload the torrent file
  uploadTorrentFile(fileInputId, savePath, paused, callback) {
    // Determines whether the FileReader interface is supported
    if (window.FileReader) {
      const files = $("input[id='" + fileInputId + "']")[0].files;
      $.each(files, function (index, file) {
        transmission.addTorrentFromFile(file, savePath, paused, callback, files.length);
      });
    } else {
      alert(system.lang.public['text-browsers-not-support-features']);
    }
  }

  checkUpdate() {
    $.ajax({
      url: this.checkUpdateScript,
      dataType: 'json',
      success(result) {
        if (result?.tag_name) {
          const update = result.created_at.slice(0, 10).replace(/-/g, '');
          const version = result.tag_name;
          if (system.config.ignoreVersion.includes(version)) {
            return;
          }
          if (semver.lt(APP_VERSION, result.tag_name)) {
            $('#area-update-infos').show();
            $('#msg-updateInfos').html(update + ' -> ' + result.name);
            const content = $('<div/>');
            const html = result.body.replace(/\r\n/g, '<br/>');

            const toolbar = $("<div style='text-align:right;'/>").appendTo(content);
            $(
              '<a href="https://github.com/transmission-web-control/transmission-web-control/releases/latest" target="_blank" class="easyui-linkbutton" data-options="iconCls:\'iconfont tr-icon-github\'"/>',
            )
              .html(result.name + ' (' + update + ')')
              .appendTo(toolbar)
              .linkbutton();
            $('<span/>').html(' ').appendTo(toolbar);
            $(
              '<a href="https://github.com/transmission-web-control/transmission-web-control/wiki" target="_blank" class="easyui-linkbutton" data-options="iconCls:\'iconfont tr-icon-help\'"/>',
            )
              .html(system.lang.public['text-how-to-update'])
              .appendTo(toolbar)
              .linkbutton();
            $('<span/>').html(' ').appendTo(toolbar);
            $(
              '<button onclick="javascript:system.addIgnoreVersion(\'' +
                version +
                '\');" class="easyui-linkbutton" data-options="iconCls:\'iconfont tr-icon-cancel-checked\'"/>',
            )
              .html(system.lang.public['text-ignore-this-version'])
              .appendTo(toolbar)
              .linkbutton();
            $('<hr/>').appendTo(content);
            $('<div/>').html(html).appendTo(content);

            $('#button-download-update').webuiPopover({
              content: content.html(),
              backdrop: true,
            });
          } else {
            $('#area-update-infos').hide();
          }
        }
      },
    });
  }

  addIgnoreVersion(version) {
    if ($.inArray(version, system.config.ignoreVersion) == -1) {
      this.config.ignoreVersion.push(version);
      this.saveConfig();
    }
    $('#button-download-update').webuiPopover('hide');
    $('#area-update-infos').hide();
  }

  // Set the language to reload the page
  changeLanguages(lang) {
    if (lang == this.lang.name || !lang) {
      return;
    }

    this.config.defaultLang = lang;
    this.saveConfig();
    location.href = '?lang=' + lang;
  }

  getStorageData(key, defaultValue) {
    return window.localStorage[key] == null ? defaultValue : window.localStorage[key];
  }

  // Debugging information
  debug(label, text) {
    console.debug(label, text);
  }

  /**
   * 根据指定的文本获取有效的树形目录Key
   */
  getValidTreeKey(text) {
    if (!text) {
      return '';
    }
    const _key = Base64.encode(text);
    return _key.replace(/[+|\/|=]/g, '0');
  }

  expandIpInfoUrl(url, ip) {
    if (url == '' || url == undefined) {
      return '';
    }
    return url
      .replace('%ip', ip)
      .replace('%lang', system.lang.name)
      .replace('%hostname', document.location.hostname)
      .replace('%host', document.location.host)
      .replace('%protocol', document.location.protocol)
      .replace('%navlang', navigator.language);
  }
}

function fileFilter(dataRows, filterString) {
  const filter = new RegExp(filterString || '.*');
  const rawDataFiltered = [];
  for (let j = 0; j < dataRows.length; ++j) {
    if (filter.test(dataRows[j].name)) {
      rawDataFiltered.push(dataRows[j]);
    }
  }
  return rawDataFiltered;
}

function restoreFileFilterInputbox(defaultFilter) {
  const langText = system.lang.torrent.attribute['filter-template-text'];
  const filterTemplate = [
    {
      id: 1,
      text: langText ? langText['1'] : 'All',
      desc: '.*',
    },
    {
      id: 2,
      text: langText ? langText['2'] : 'BitComet padding file',
      desc: '____padding_file',
    },
    {
      id: 3,
      text: langText ? langText['3'] : 'Unnecessary files',
      desc: '(.*\\.(url|lnk)$)|(RARBG_DO_NOT_MIRROR\\.exe)|(____padding_file)',
    },
  ];
  $('<input id="torrent-files-filter-string" style="width:300px;">')
    .insertAfter('#torrent-files-filter')
    .combobox({
      valueField: 'desc',
      textField: 'desc',
      panelWidth: 400,
      panelHeight: 'auto',
      formatter(row) {
        const s =
          '<span style="font-weight:bold; padding:3px;">' +
          row.text +
          '</span><br/>' +
          '<span style="padding-left:10px;">' +
          row.desc +
          '</span>';
        return s;
      },
    })
    .combobox('loadData', filterTemplate)
    .combobox('setValue', defaultFilter);
}

function pagerFilter(data) {
  let isFileData = false;
  let filterChanged = false;

  if (typeof data.length === 'number' && typeof data.splice === 'function') {
    // is array
    data = {
      total: data.length,
      rows: data,
    };
  }

  isFileData = this.id == 'torrent-files-table';
  if (isFileData) {
    var fileFilterString = $('#torrent-files-filter-string').val();
    filterChanged =
      data.filterString !== fileFilterString ||
      (data.filterString && data.originalRows.length == data.unfilteredRows.length);
    if (filterChanged) {
      data.torrentId = system.currentTorrentId;
      const rawData = data.unfilteredRows || data.originalRows || data.rows;
      const rawDataFiltered = fileFilter(rawData, fileFilterString);
      data.originalRows = rawDataFiltered;
      data.total = rawDataFiltered.length;
      if (!data.unfilteredRows) {
        data.unfilteredRows = rawData;
      }
      data.filterString = fileFilterString;
    }
  }

  const dg = $(this);
  const opts = dg.datagrid('options');
  const pager = dg.datagrid('getPager');
  const buttons = dg.data('buttons');
  // system.debug("pagerFilter.buttons:",buttons);
  pager.pagination({
    onSelectPage(pageNum, pageSize) {
      opts.pageNumber = pageNum;
      opts.pageSize = pageSize;
      pager.pagination('refresh', {
        pageNumber: pageNum,
        pageSize,
      });
      dg.datagrid('loadData', data);
    },
    buttons,
  });
  if (!data.originalRows) {
    data.originalRows = data.rows;
  }
  const start = filterChanged ? 0 : (opts.pageNumber - 1) * parseInt(opts.pageSize);
  const end = start + parseInt(opts.pageSize);
  data.rows = data.originalRows.slice(start, end);

  if (buttons?.length) {
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      if (button.id && button.title) {
        $('#' + button.id, pager).attr('title', button.title);
      }
    }
  }

  if (isFileData) {
    restoreFileFilterInputbox(fileFilterString);
  }

  return data;
}
