import { Base64 } from 'js-base64';
import * as lo from 'lodash-es';
import semver from 'semver';

import { events, userActions } from './events';
import { formatDuration, formatLongTime, getGrayLevel } from './formatter.ts';
import { getTorrentProgressBar, SystemBase, templateFiles } from './system-base';
import { TorrentStatus, transmission } from './transmission';
import { formatSize } from './utils';
import { APP_VERSION } from './version';

// Current system global object
export class System extends SystemBase {
  loadingTorrent = new Set();
  lastTrackersTree = {};
  searchKey = '';

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
      content: templateFiles[`../twc/template/dialog-torrent-attribute.html`],
      onExpand() {
        if (system.currentTorrentId !== 0 && $(this).data('isload')) {
          system.getTorrentInfos(system.currentTorrentId);
        } else {
          system.clearTorrentAttribute();
        }

        if (!$(this).data('isload')) {
          $(this).data('isload', true);
        }
      },
    });

    userActions.on('selectTorrent', (_, t) => {
      system.getTorrentInfos(t.id);
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
    this.initEvent();
    // Check for updates
    this.checkUpdate();
    void this.connect();
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
    // $('#button-cancel-checked').on('click', function() {
    //   system.control.torrentList.datagrid('uncheckAll');
    // });

    // 树型目录事件
    this.panel.left.tree({
      onExpand(node) {
        console.log({ node });
        system.config.ui.status.tree[node.id] = node.state;
        system.saveConfig();
      },
      onCollapse(node) {
        console.log({ node });
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

  /**
   * used in html
   */
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
        if (status === 1) {
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
    if (!sources || !sources.length) {
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
    this.uiIsInitialized = true;
    let status = this.lastUIStatus.tree;
    for (const [key, value] of Object.entries(status)) {
      const node1 = this.panel.left.tree('find', key);
      if (node1 && node1.target) {
        if (value === 'open') {
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
    if (this.lastUIStatus.size.nav && this.lastUIStatus.size.nav.width) {
      this.panel.main
        .layout('panel', 'west')
        .panel('resize', { width: this.lastUIStatus.size.nav.width + 5 });
      this.panel.main.layout('resize');
    }

    if (this.lastUIStatus.size.attribute && this.lastUIStatus.size.attribute.height) {
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
            console.log(data);
            events.emit('userChangeTorrent', []);
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
            events.emit('userChangeTorrent', []);
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
        if (ids.length === 0) {
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
  } // end initToolbar

  // Initialize the status bar
  initStatusBar() {
    this.panel.statusbar
      .find('#status_title_downloadspeed')
      .html(this.lang.statusbar.downloadspeed);
    this.panel.statusbar.find('#status_title_uploadspeed').html(this.lang.statusbar.uploadspeed);
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

  // refresh the tree
  updateTreeNodesUI() {
    this.rebuildNavTorrentStatus();
    this.rebuildNavServers();
    this.rebuildNavStatistics();
    this.rebuildNavFolders();
    // this.resetNavLabels();
  }

  /**
   * 重置导航栏种子状态信息
   */
  rebuildNavTorrentStatus() {
    // Paused
    if (this.torrentStatusTree[TorrentStatus.stopped].length) {
      system.updateTreeNodeText(
        'paused',
        system.lang.tree.paused +
          this.showNodeMoreInfos(this.torrentStatusTree[TorrentStatus.stopped].length),
      );
    } else {
      system.updateTreeNodeText('paused', system.lang.tree.paused);
    }

    // Seeding
    if (this.torrentStatusTree[TorrentStatus.seed].length) {
      system.updateTreeNodeText(
        'sending',
        system.lang.tree.sending +
          this.showNodeMoreInfos(this.torrentStatusTree[TorrentStatus.seed].length),
      );
    } else {
      system.updateTreeNodeText('sending', system.lang.tree.sending);
    }

    // Waiting for seed
    if (this.torrentStatusTree[TorrentStatus.seedwait].length) {
      const node = system.panel.left.tree('find', 'sending');
      const childs = system.panel.left.tree('getChildren', node.target);
      const text =
        system.lang.tree.wait +
        this.showNodeMoreInfos(this.torrentStatusTree[TorrentStatus.seedwait].length);
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
    if (this.torrentStatusTree[TorrentStatus.check].length) {
      system.updateTreeNodeText(
        'check',
        system.lang.tree.check +
          this.showNodeMoreInfos(this.torrentStatusTree[TorrentStatus.check].length),
      );
    } else {
      system.updateTreeNodeText('check', system.lang.tree.check);
    }
    // Waiting for check
    if (this.torrentStatusTree[TorrentStatus.checkwait].length) {
      const node = system.panel.left.tree('find', 'check');
      const childs = system.panel.left.tree('getChildren', node.target);
      const text =
        system.lang.tree.wait +
        this.showNodeMoreInfos(this.torrentStatusTree[TorrentStatus.checkwait].length);
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
    if (this.torrentStatusTree[TorrentStatus.download].length) {
      system.updateTreeNodeText(
        'downloading',
        system.lang.tree.downloading +
          this.showNodeMoreInfos(this.torrentStatusTree[TorrentStatus.download].length),
      );
    } else {
      system.updateTreeNodeText('downloading', system.lang.tree.downloading);
    }
    // Waiting for download
    if (this.torrentStatusTree[TorrentStatus.downloadwait].length) {
      var node = system.panel.left.tree('find', 'downloading');
      var childs = system.panel.left.tree('getChildren', node.target);
      var text =
        system.lang.tree.wait +
        this.showNodeMoreInfos(this.torrentStatusTree[TorrentStatus.downloadwait].length);
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
      system.lang.tree.actively + this.showNodeMoreInfos(this.torrentStatusExtra.active.length),
    );
    // With error
    system.updateTreeNodeText(
      'error',
      system.lang.tree.error + this.showNodeMoreInfos(this.torrentStatusExtra.error.length),
    );
    // With warning
    system.updateTreeNodeText(
      'warning',
      system.lang.tree.warning + this.showNodeMoreInfos(this.torrentStatusExtra.warning.length),
    );

    var node = system.panel.left.tree('getSelected');
    if (node != null) {
      system.loadTorrentToList({ node });
    }

    // Total count
    system.updateTreeNodeText(
      'torrent-all',
      system.lang.tree.all +
        this.showNodeMoreInfos(
          this.allTorrents.size,
          Array.from(this.allTorrents.values()).reduce((pre, cur) => pre + cur.totalSize, 0),
        ),
    );
  }

  /**
   * 重置导航栏服务器信息
   */
  rebuildNavServers() {
    // 获取服务器分布主节点
    let serversNode = this.panel.left.tree('find', 'servers');
    let serversNode_collapsed;

    if (serversNode) {
      serversNode_collapsed = serversNode.state;
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
    for (const [tracker, stat] of Object.entries(this.trackersTree)) {
      if (!stat.pt && !system.config.showBTServers) {
        continue;
      }
      const node = system.panel.left.tree('find', tracker);
      const text = tracker + this.showNodeMoreInfos(stat.torrents.length, stat.size);
      if (node) {
        system.updateTreeNodeText(
          tracker,
          text,
          tracker.connected ? 'iconfont tr-icon-server' : 'iconfont tr-icon-server-error',
        );
      } else {
        system.appendTreeNode(stat.pt ? serversNode : BTServersNode, [
          {
            id: tracker,
            text,
            iconCls: stat.connected ? 'iconfont tr-icon-server' : 'iconfont tr-icon-server-error',
          },
        ]);
      }
    }
    // Collapse the node if it was before
    if (serversNode_collapsed === 'closed') {
      this.panel.left.tree('collapse', serversNode.target);
    }

    if (system.config.showBTServers && BTServersNode && BTServersNodeState === 'closed') {
      this.panel.left.tree('collapse', BTServersNode.target);
    }
    this.lastTrackersTree = this.trackersTree;
  }

  /**
   * 重置导航栏数据统计信息
   */
  rebuildNavStatistics() {
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

  // Gets the current state of the server
  getServerStatus() {
    transmission.getStatus(function (data) {
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
  loadTorrentToList({ node }) {
    if (!this.allTorrents.size) {
      return;
    }

    if (!node) {
      return;
    }

    let torrents = null;
    const parent = this.panel.left.tree('getParent', node.target) || {
      id: '',
    };
    let currentNodeId = this.panel.left.data('currentNodeId');

    if (currentNodeId !== node.id) {
      // 当切换了导航菜单时，取消选择所有内容
      this.control.grid.api.deselectAll();
      currentNodeId = node.id;
    }
    this.panel.left.data('currentNodeId', currentNodeId);

    if (parent.id === this.parentID && node.id === this.selectedNodeID) {
      return;
    }
    this.selectedNodeID = node.id;
    this.parentID = parent.id;

    switch (parent.id) {
      case 'servers':
      case 'btservers':
        if (node.id === 'btservers') {
          this.torrentFilter = (t) => !t.isPrivate;
        } else {
          this.torrentFilter = (t) =>
            t.trackerStats.some((v) => v.sitename === node.id || v.host === node.id);
        }
        break;
      default:
        switch (node.id) {
          case 'torrent-all':
          case 'servers':
            this.torrentFilter = () => true;
            break;
          case 'paused':
            this.torrentFilter = (t) => t.status === TorrentStatus.stopped;
            break;
          case 'sending':
            this.torrentFilter = (t) => TorrentStatus.seed === t.status;
            break;

          case 'seedwait':
            this.torrentFilter = (t) => TorrentStatus.seedwait === t.status;
            break;

          case 'check':
            this.torrentFilter = (t) => TorrentStatus.check === t.status;
            break;
          case 'checkwait':
            this.torrentFilter = (t) => TorrentStatus.checkwait === t.status;
            break;

          case 'downloading':
            this.torrentFilter = (t) => TorrentStatus.download === t.status;
            break;
          case 'downloadwait':
            this.torrentFilter = (t) => TorrentStatus.downloadwait === t.status;
            break;

          case 'actively':
            this.torrentFilter = (t) => t.rateUpload + t.rateDownload !== 0;
            break;

          case 'error':
            this.torrentFilter = (t) => t.error !== 0;
            break;

          case 'warning':
            this.torrentFilter = (t) => Boolean(t.warning);
            break;

          case 'search-result':
            this.torrentFilter = (t) => t.name.includes(system.searchKey);
            break;

          case 'btservers':
            this.torrentFilter = (t) => !t.isPrivate;
            break;

          default:
            // Categories
            if (node.id.indexOf('folders-') !== -1) {
              const fullPath = node.fullPath;
              console.log(fullPath);
              // avoid partial prefix match
              this.torrentFilter = (t) =>
                t.normalizedPath === fullPath || t.normalizedPath.startsWith(fullPath + '/');
            } else if (node.id.indexOf('label-') !== -1) {
              const labelIndex = parseInt(node.labelIndex);
              torrents = [];
              for (const key in transmission.torrents.all) {
                const item = transmission.torrents.all[key];
                var labels = this.config.labelMaps[item.hashString];
                if (labels && $.inArray(labelIndex, labels) !== -1) {
                  torrents.push(item);
                }
              }
            }
            break;
        }
        break;
    }

    // if (this.config.defaultSelectNode !== node.id) {
    // this.control.torrentList.datagrid('loadData', []);
    // this.torrentFilter = () => false;
    // this.config.defaultSelectNode = node.id;
    // this.saveConfig();
    // }

    this.refreshDataGrid();
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
    const rows = this.checkedRows;
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
          system.control.grid.api.deselectAll();
          events.emit('userChangeTorrent', ids);
        },
      );
    }
  }

  // Looks for the specified torrent from the torrent list
  searchTorrents(key) {
    if (key === '') {
      return;
    }
    const result = transmission.torrents.search(key);
    if (result == null || result.length === 0) {
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
        iconCls: node.iconCls,
      });
    }
    this.panel.left.tree('select', node.target);
  }

  // Get the torrent details
  // TODO replace with modern UI
  async getTorrentInfos(id) {
    if (!this.allTorrents.has(id)) {
      return;
    }

    this.currentTorrentId = id;
    // Loads only when expanded
    if (this.panel.attribute.panel('options').collapsed) {
      return;
    }

    const torrent = this.allTorrents.get(id);
    this.loadingTorrent.add(id);
    const fields = [
      'fileStats',
      'trackerStats',
      'peers',
      'leftUntilDone',
      'status',
      'rateDownload',
      'rateUpload',
      'uploadedEver',
      'uploadRatio',
      'error',
      'errorString',
      'pieces',
      'pieceCount',
      'pieceSize',
    ];
    if (!torrent.moreInfosTag) {
      fields.push('files', 'trackers', 'comment', 'dateCreated', 'creator', 'downloadDir');
    }
    transmission.torrents
      .getMoreInfos(fields, id)
      .then((result) => {
        // system.panel.attribute.panel({iconCls:""});

        // Merge the currently returned value to the current torrent
        jQuery.extend(torrent, result[0]);
        if (system.currentTorrentId === 0 || this.currentTorrentId !== id) {
          console.log('return here');
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
      })
      .finally(() => {
        this.loadingTorrent.delete(id);
      });
  }

  clearTorrentAttribute() {
    this.panel.attribute.find('#torrent-files-table').datagrid('loadData', []);
    this.panel.attribute.find('#torrent-servers-table').datagrid('loadData', []);
    this.panel.attribute.find('#torrent-peers-table').datagrid('loadData', []);
    this.panel.attribute.find("span[id*='torrent-attribute-value']").html('');
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
          value = system.lang.torrent.statusText[value];
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
        bytesCompleted: stats.bytesCompleted,
        percentDone: getTorrentProgressBar(percentDone, transmission._status.download),
        length: file.length,
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
    for (const stats of trackerStats) {
      const rowdata = {};
      for (const key in stats) {
        switch (key) {
          case 'downloadCount':
          case 'leecherCount':
          case 'seederCount':
            rowdata[key] = stats[key] === -1 ? system.lang.public['text-unknown'] : stats[key];
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
    // transmission.torrents.addTracker(torrent);
    this.updateCurrentPageDatas('id', datas, this.panel.attribute.find('#torrent-servers-table'));
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
      rowdata.progress = getTorrentProgressBar(percentDone, transmission._status.download);
      datas.push(rowdata);
    }

    this.updateCurrentPageDatas(
      'address',
      datas,
      system.panel.attribute.find('#torrent-peers-table'),
    );
  }

  // Fill torrent parameters
  fillTorrentConfig(t) {
    if (
      system.panel.attribute.find('#torrent-attribute-tabs').data('selectedIndex')?.toString() !==
      '4'
    ) {
      return;
    }
    transmission.torrents.getConfig(t.id, function (result) {
      if (result == null) {
        return;
      }

      const torrent = lo.merge(t, result[0]);
      // Merge the currently returned value to the current torrent
      if (system.currentTorrentId === 0) {
        return;
      }

      $.each(torrent, function (key, value) {
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

            system.panel.attribute.find(`input[enabledof='${key}']`).prop('disabled', !checked);
            if (useTag) {
              system.panel.attribute
                .find('#' + key)
                .prop('indeterminate', indeterminate)
                .data('_tag', value);
            }
            system.panel.attribute.find('#' + key).prop('checked', checked);

            break;

          default:
            system.panel.attribute.find(`#${key}`).val(value);
            system.panel.attribute.find(`#${key}`).numberspinner('setValue', value);
            break;
        }
      });
    });
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

    if (isFileFilterMode == false && (rows.length == 0 || datas.length != tableData.total)) {
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
          return getTorrentProgressBar(percentDone, transmission.torrents.all[row.id]);
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
      }, system.config.reloadStep);
      return;
    }
    this.reloadSession();
    this.getServerStatus();
    void this.fetchData(true);
  }

  /**
   * 选中或反选种子时，改变菜单的可操作状态
   * @param rowIndex  当前行索引，当全选/反选时为 'all'
   * @param rowData    当前行数据，当全选/反选时为 true 或 false，全选为false, 全反选为 true
   * @return void
   */
  checkTorrentRow(rowIndex, rowData) {
    // 获取当前已选中的行
    // 是否全选或反选
    if (rowIndex === 'all') {
      if (this.checkedRows.length === 0) {
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
    if (this.checkedRows.length === 0) {
      // 禁用所有菜单
      $(
        '#toolbar_start, #toolbar_pause, #toolbar_rename, #toolbar_remove, #toolbar_recheck, #toolbar_changeDownloadDir,#toolbar_changeSpeedLimit,#toolbar_morepeers,#toolbar_copyPath',
        this.panel.toolbar,
      ).linkbutton({
        disabled: true,
      });
      this.panel.toolbar.find('#toolbar_queue').menubutton('disable');
      // 当仅有一条数据被选中时
    } else if (this.checkedRows.length === 1) {
      // 设置 删除、改名、变更保存目录、移动队列功能可用
      $(
        '#toolbar_remove, #toolbar_rename, #toolbar_changeDownloadDir,#toolbar_changeSpeedLimit,#toolbar_copyPath',
        this.panel.toolbar,
      ).linkbutton({
        disabled: false,
      });
      this.panel.toolbar.find('#toolbar_queue').menubutton('enable');
      const torrent = this.allTorrents.get(rowData.id);
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

  replaceURI(text) {
    const reg = /(http|https|ftp):\/\/([^/:]+)(:\d*)?([^# ]*)/gi;
    return text.replace(reg, function (url) {
      return '<a href="' + url + '" target="_blank">' + url + '</a>';
    });
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
        if (result && result.tag_name) {
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
    if (!system.config.ignoreVersion.includes(version)) {
      this.config.ignoreVersion.push(version);
      this.saveConfig();
    }
    $('#button-download-update').webuiPopover('hide');
    $('#area-update-infos').hide();
  }

  // Set the language to reload the page
  changeLanguages(lang) {
    if (lang === this.lang.name || !lang) {
      return;
    }

    this.config.defaultLang = lang;
    this.saveConfig();
    location.href = '?lang=' + lang;
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

  if (buttons && buttons.length) {
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
