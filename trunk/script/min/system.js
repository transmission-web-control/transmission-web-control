var system={version:"0.2 Beta",codeupdate:"20130131",config:{autoReload:true,reloadStep:5E3,pageSize:30,defaultSelectNode:null},panel:null,lang:null,reloading:false,autoReloadTimer:null,downloadDir:"",islocal:false,B64:new Base64,currentTorrentId:0,control:{tree:null,torrentlist:null},serverConfig:null,serverSessionStats:null,templates:{"dialog-about.html":"","dialog-system-config.html":"","dialog-torrent-add.html":"","dialog-torrent-addfile.html":"","dialog-torrent-remove-confirm.html":""},setlang:function(a,
b){a||(a=navigator.language||navigator.browserLanguage);a||(a="zh-CN");if(a.indexOf("-")!=-1)a=a.split("-")[0].toLocaleLowerCase()+"-"+a.split("-")[1].toLocaleUpperCase();this.languages[a]||(a="en");$.getScript("lang/"+a+".js",function(){$.getScript("script/easyui/locale/easyui-lang-"+a.replace("-","_")+".js",function(){b&&b()})})},init:function(a,b){this.readConfig();this.islocal=b==1?true:false;this.panel={main:$("#main"),top:$("#m_top"),toolbar:$("#m_toolbar"),left_layout:$("#m_left_layout"),left:$("#m_left"),
body:$("#m_body"),layout_body:$("#layout_body"),list:$("#m_list"),attribute:$("#m_attribute"),bottom:$("#m_bottom"),title:$("#m_title"),status:$("#m_status"),statusbar:$("#m_statusbar"),status_text:$("#status_text"),droparea:$("#dropArea")};this.lang==null?this.setlang(a,function(){system.initdata()}):this.initdata()},initdata:function(){this.panel.title.text(this.lang.system.title+" "+this.version+" ("+this.codeupdate+")");$(document).attr("title",this.lang.system.title+" "+this.version);var a=[],
b="<span>"+this.lang.title.left+"</span>";a.push("<span class='tree-title-toolbar'>");for(var c in this.lang.tree.toolbar.nav)a.push('<a href="javascript:void(0);" id="tree-toolbar-nav-'+c+'" class="easyui-linkbutton" data-options="plain:true,iconCls:\'icon-disabled\'" onclick="javascript:system.navToolbarClick(this);">'+this.lang.tree.toolbar.nav[c]+"</a>");a.push("</span>");if(a.length>1){b+=a.join("");this.panel.left_layout.panel("setTitle",b);for(c in this.lang.tree.toolbar.nav)$("#tree-toolbar-nav-"+
c).linkbutton()}else this.panel.left_layout.panel("setTitle",b);this.panel.body.panel("setTitle",this.lang.title.list);this.panel.status.panel("setTitle",this.lang.title.status);this.panel.attribute.panel({title:this.lang.title.attribute,onExpand:function(){system.currentTorrentId!=0&&$(this).data("isload")?system.getTorrentInfos(system.currentTorrentId):system.clearTorrentAttribute()},onLoad:function(){if(!$(this).data("isload")){$(this).data("isload",true);system.currentTorrentId!=0&&setTimeout(function(){system.getTorrentInfos(system.currentTorrentId)},
500)}}});$.each(this.languages,function(d,e){$("<option/>").text(e).val(d).attr("selected",d==system.lang.name?true:false).appendTo(system.panel.top.find("#lang"))});this.panel.top.find("#lang").change(function(){location.href="?lang="+this.value});this.panel.toolbar.attr("class","panel-header");this.initTree();this.initToolbar();this.initStatusBar();this.initTorrentTable();this.connect();this.initEvent()},initEvent:function(){$(window).resize(function(){$("#main").layout("resize")});this.panel.droparea[0].addEventListener("dragover",
function(a){a.stopPropagation();a.preventDefault();system.debug("#dropArea.dragover")},false);this.panel.list[0].addEventListener("dragover",function(a){a.stopPropagation();a.preventDefault();system.panel.droparea.show();system.debug("dragover")},false);this.panel.droparea[0].addEventListener("drop",function(a){a.stopPropagation();a.preventDefault();system.panel.droparea.hide();system.debug("drop.e.dataTransfer:",a.dataTransfer);system.checkDropFiles(a.dataTransfer.files)},false);this.panel.droparea[0].addEventListener("dragleave",
function(a){a.stopPropagation();a.preventDefault();system.panel.droparea.hide();system.debug("dragleave")},false);$("#text-drop-title").html(this.lang["public"]["text-drop-title"])},navToolbarClick:function(a){var b=a.id,c=$(a).data("status"),d=null;switch(b){case "tree-toolbar-nav-folders":d=this.panel.left.tree("find","folders");break;case "tree-toolbar-nav-statistics":d=this.panel.left.tree("find","statistics")}if(d){if(c==1){$(a).linkbutton({iconCls:"icon-disabled"});$(d.target).parent().hide();
c=0}else{$(a).linkbutton({iconCls:"icon-enabled"});$(d.target).parent().show();c=1}$(a).data("status",c)}},checkDropFiles:function(a){if(a&&a.length){for(var b=[],c=0;c<a.length;c++){var d=a[c];d.name.split(".").pop().toLowerCase()=="torrent"&&b.push(d)}if(b.length>0){a=$("#dialog-torrent-addfile");if(a.length){a.data("files",b);a.dialog("open");a.dialog({content:system.templates["dialog-torrent-addfile.html"]})}else{$("<div/>").attr("id","dialog-torrent-addfile").data("files",b).appendTo(document.body).dialog({title:system.lang.toolbar["add-torrent"],
width:620,height:300,resizable:true,cache:false,content:"loading...",modal:true});$.get("template/dialog-torrent-addfile.html",function(e){system.templates["dialog-torrent-addfile.html"]=e;$("#dialog-torrent-addfile").dialog({content:e})})}}}},initTree:function(){this.panel.left.tree({data:[{id:"torrent-all",iconCls:"icon-home",text:this.lang.tree.all+" ("+this.lang.tree.status.loading+")",children:[{id:"downloading",text:this.lang.tree.downloading,iconCls:"icon-download"},{id:"paused",text:this.lang.tree.paused,
iconCls:"icon-pause"},{id:"sending",text:this.lang.tree.sending,iconCls:"icon-seed"},{id:"check",text:this.lang.tree.check,iconCls:"icon-check"},{id:"actively",text:this.lang.tree.actively,iconCls:"icon-actively"},{id:"error",text:this.lang.tree.error,iconCls:"icon-error"},{id:"warning",text:this.lang.tree.warning,iconCls:"icon-warning"}]},{id:"servers",text:this.lang.tree.servers,iconCls:"icon-servers",children:[{id:"servers-loading",text:this.lang.tree.status.loading,iconCls:"tree-loading"}]},{id:"folders",
text:this.lang.tree.folders,children:[{id:"folders-loading",text:this.lang.tree.status.loading,iconCls:"tree-loading"}]},{id:"statistics",text:this.lang.tree.statistics.title,state:"closed",iconCls:"icon-chart",children:[{id:"cumulative-stats",text:this.lang.tree.statistics.cumulative,children:[{id:"uploadedBytes",text:this.lang.tree.statistics.uploadedBytes},{id:"downloadedBytes",text:this.lang.tree.statistics.downloadedBytes},{id:"filesAdded",text:this.lang.tree.statistics.filesAdded},{id:"sessionCount",
text:this.lang.tree.statistics.sessionCount},{id:"secondsActive",text:this.lang.tree.statistics.secondsActive}]},{id:"current-stats",text:this.lang.tree.statistics.current,children:[{id:"current-uploadedBytes",text:this.lang.tree.statistics.uploadedBytes},{id:"current-downloadedBytes",text:this.lang.tree.statistics.downloadedBytes},{id:"current-filesAdded",text:this.lang.tree.statistics.filesAdded},{id:"current-sessionCount",text:this.lang.tree.statistics.sessionCount},{id:"current-secondsActive",
text:this.lang.tree.statistics.secondsActive}]}]}],onSelect:function(c){system.loadTorrentToList({node:c})},lines:true});for(var a in this.lang.tree.toolbar.nav){var b=this.panel.left.tree("find",a);$(b.target).parent().hide()}if(this.config.defaultSelectNode)(a=this.panel.left.tree("find",this.config.defaultSelectNode))&&this.panel.left.tree("select",a.target)},initTorrentTable:function(){this.control.torrentlist=$("<table/>").attr("class","torrent-list").appendTo(this.panel.list);$.get("template/torrent-fields.json?time="+
new Date,function(a){a=a.fields;for(var b in a){a[b].title=system.lang.torrent.fields[a[b].field];if(a[b].formatter)switch(a[b].formatter){case "size":a[b].formatter=function(c){return formatSize(c)};break;case "speed":a[b].formatter=function(c){return formatSize(c,true,"speed")}}}system.control.torrentlist.datagrid({autoRowHeight:false,pagination:true,rownumbers:true,remoteSort:false,checkOnSelect:false,pageSize:system.config.pageSize,idField:"id",fit:true,striped:true,columns:[a],onCheck:function(c,
d){system.checkTorrentRow(c,d)},onUncheck:function(c,d){system.checkTorrentRow(c,d)},onCheckAll:function(){system.checkTorrentRow("all",false)},onUncheckAll:function(){system.checkTorrentRow("all",true)},onSelect:function(c,d){$(this).datagrid("clearSelections");system.panel.attribute.panel("options").collapsed&&system.panel.layout_body.layout("expand","south");system.getTorrentInfos(d.id)},onUnselect:function(){system.panel.attribute.panel("options").collapsed||system.panel.layout_body.layout("collapse",
"south");system.currentTorrentId=0},onBeforeLoad:function(){system.currentTorrentId=0},onSortColumn:function(c,d){system.debug("sort:",c+","+d);var e=c;if(c=="percentDone")e="percentDoneNumber";e=system.control.torrentlist.datagrid("getData").originalRows.sort(arrayObjectSort(e,d));system.control.torrentlist.datagrid("loadData",e)}})},"json")},checkTorrentRow:function(a,b){if(a=="all"){this.panel.toolbar.find("#toolbar_start").linkbutton({disabled:b});this.panel.toolbar.find("#toolbar_pause").linkbutton({disabled:b});
this.panel.toolbar.find("#toolbar_remove").linkbutton({disabled:b});this.panel.toolbar.find("#toolbar_recheck").linkbutton({disabled:b});this.panel.toolbar.find("#toolbar_changeDownloadDir").linkbutton({disabled:b})}else if(this.control.torrentlist.datagrid("getChecked").length==0){this.panel.toolbar.find("#toolbar_start").linkbutton({disabled:true});this.panel.toolbar.find("#toolbar_pause").linkbutton({disabled:true});this.panel.toolbar.find("#toolbar_remove").linkbutton({disabled:true});this.panel.toolbar.find("#toolbar_recheck").linkbutton({disabled:true});
this.panel.toolbar.find("#toolbar_changeDownloadDir").linkbutton({disabled:true})}else{this.panel.toolbar.find("#toolbar_remove").linkbutton({disabled:false});this.panel.toolbar.find("#toolbar_changeDownloadDir").linkbutton({disabled:false});switch(transmission.torrents.all[b.id].status){case transmission._status.stopped:this.panel.toolbar.find("#toolbar_start").linkbutton({disabled:false});this.panel.toolbar.find("#toolbar_pause").linkbutton({disabled:true});this.panel.toolbar.find("#toolbar_recheck").linkbutton({disabled:false});
break;case transmission._status.check:case transmission._status.checkwait:this.panel.toolbar.find("#toolbar_start").linkbutton({disabled:true});this.panel.toolbar.find("#toolbar_pause").linkbutton({disabled:true});this.panel.toolbar.find("#toolbar_recheck").linkbutton({disabled:true});break;default:this.panel.toolbar.find("#toolbar_start").linkbutton({disabled:true});this.panel.toolbar.find("#toolbar_pause").linkbutton({disabled:false});this.panel.toolbar.find("#toolbar_recheck").linkbutton({disabled:true})}}},
initToolbar:function(){this.panel.toolbar.find("#toolbar_about").linkbutton({text:this.lang.toolbar.about}).attr("title",this.lang.toolbar.tip.about).click(function(){var a=$("#dialog-about");if(a.length){a.dialog("open");a.dialog({content:system.templates["dialog-about.html"]})}else{$("<div/>").attr("id","dialog-about").appendTo(document.body).dialog({title:system.lang.toolbar.about,width:340,height:210,resizable:true,cache:false,content:"loading...",modal:true});$.get("template/dialog-about.html?time="+
new Date,function(b){system.templates["dialog-about.html"]=b;$("#dialog-about").dialog({content:b})})}});this.panel.toolbar.find("#toolbar_label_reload_time").html(this.lang.toolbar["reload-time"]);this.panel.toolbar.find("#toolbar_label_reload_time_unit").html(this.lang.toolbar["reload-time-unit"]);this.panel.toolbar.find("#toolbar_reload_time").numberspinner({value:this.config.reloadStep/1E3,min:3,disabled:!this.config.autoReload,onChange:function(){var a=this.value;if($.isNumeric(a)){system.config.reloadStep=
a*1E3;system.saveConfig()}}});this.panel.toolbar.find("#toolbar_autoreload").linkbutton({text:this.config.autoReload?this.lang.toolbar["autoreload-enabled"]:this.lang.toolbar["autoreload-disabled"],iconCls:this.config.autoReload?"icon-enabled":"icon-disabled"}).attr("title",this.config.autoReload?this.lang.toolbar.tip["autoreload-disabled"]:this.lang.toolbar.tip["autoreload-enabled"]).click(function(){if(system.config.autoReload){system.config.autoReload=false;clearTimeout(system.autoReloadTimer);
system.panel.toolbar.find("#toolbar_reload_time").numberspinner("disable")}else{system.config.autoReload=true;system.reloadData();system.panel.toolbar.find("#toolbar_reload_time").numberspinner("enable")}system.saveConfig();$(this).linkbutton({text:system.config.autoReload?system.lang.toolbar["autoreload-enabled"]:system.lang.toolbar["autoreload-disabled"],iconCls:system.config.autoReload?"icon-enabled":"icon-disabled"}).attr("title",system.config.autoReload?system.lang.toolbar.tip["autoreload-disabled"]:
system.lang.toolbar.tip["autoreload-enabled"])});this.panel.toolbar.find("#toolbar_add_torrents").linkbutton({text:this.lang.toolbar["add-torrent"],disabled:false}).attr("title",this.lang.toolbar.tip["add-torrent"]).click(function(){var a=$("#dialog-torrent-add");if(a.length){a.dialog("open");a.dialog({content:system.templates["dialog-torrent-add.html"]})}else{$("<div/>").attr("id","dialog-torrent-add").appendTo(document.body).dialog({title:system.lang.toolbar["add-torrent"],width:620,height:400,
resizable:true,cache:false,content:"loading...",modal:true});$.get("template/dialog-torrent-add.html?time="+new Date,function(b){system.templates["dialog-torrent-add.html"]=b;$("#dialog-torrent-add").dialog({content:b})})}});this.panel.toolbar.find("#toolbar_start_all").linkbutton({text:this.lang.toolbar["start-all"],disabled:false}).attr("title",this.lang.toolbar.tip["start-all"]).click(function(){$(this).linkbutton({iconCls:"icon-loading"});transmission.exec({method:"torrent-start"},function(a){var b=
system.panel.toolbar.find("#toolbar_start_all");b.linkbutton({iconCls:"icon-start-all"});a.result=="success"&&b.linkbutton({disabled:true})})});this.panel.toolbar.find("#toolbar_pause_all").linkbutton({text:this.lang.toolbar["pause-all"],disabled:false}).attr("title",this.lang.toolbar.tip["pause-all"]).click(function(){transmission.exec({method:"torrent-stop"},function(a){a.result=="success"&&system.panel.toolbar.find("#toolbar_pause_all").linkbutton({disabled:true})})});this.panel.toolbar.find("#toolbar_tracker_replace").attr("title",
this.lang.toolbar.tip["tracker-replace"]).click(function(){var a=$("#dialog-system-replaceTracker");if(a.length){a.dialog("open");a.dialog({content:system.templates["dialog-system-replaceTracker.html"]})}else{$("<div/>").attr("id","dialog-system-replaceTracker").appendTo(document.body).dialog({title:system.lang.dialog["system-replaceTracker"].title,width:600,height:220,resizable:true,cache:false,content:"loading...",modal:true});$.get("template/dialog-system-replaceTracker.html?time="+new Date,function(b){system.templates["dialog-system-replaceTracker.html"]=
b;$("#dialog-system-replaceTracker").dialog({content:b})})}});this.panel.toolbar.find("#toolbar_start").linkbutton({disabled:true}).attr("title",this.lang.toolbar.tip.start).click(function(){system.changeSelectedTorrentStatus("start",$(this))});this.panel.toolbar.find("#toolbar_pause").linkbutton({disabled:true}).attr("title",this.lang.toolbar.tip.pause).click(function(){system.changeSelectedTorrentStatus("stop",$(this))});this.panel.toolbar.find("#toolbar_recheck").linkbutton({disabled:true}).attr("title",
this.lang.toolbar.tip.recheck).click(function(){var a=system.control.torrentlist.datagrid("getChecked");if(a.length>0)if(a.length==1)if(transmission.torrents.all[a[0].id].percentDone>0)confirm(system.lang.toolbar.tip["recheck-confirm"])&&system.changeSelectedTorrentStatus("verify",$(this));else system.changeSelectedTorrentStatus("verify",$(this));else confirm(system.lang.toolbar.tip["recheck-confirm"])&&system.changeSelectedTorrentStatus("verify",$(this))});this.panel.toolbar.find("#toolbar_remove").linkbutton({disabled:true}).attr("title",
this.lang.toolbar.tip.remove).click(function(){var a=system.control.torrentlist.datagrid("getChecked"),b=[],c;for(c in a)b.push(a[c].id);if(b.length!=0){a=$("#dialog-torrent-remove-confirm");if(a.length){a.dialog("open");a.dialog("refresh");a.data("ids",b)}else $("<div/>").attr("id","dialog-torrent-remove-confirm").data("ids",b).appendTo(document.body).dialog({title:system.lang.dialog["torrent-remove"].title,width:350,height:150,resizable:false,cache:true,href:"template/dialog-torrent-remove-confirm.html",
modal:true})}});this.panel.toolbar.find("#toolbar_changeDownloadDir").linkbutton({disabled:true}).attr("title",this.lang.toolbar.tip["change-download-dir"]).click(function(){var a=system.control.torrentlist.datagrid("getChecked"),b=[],c;for(c in a)b.push(a[c].id);if(b.length!=0){a=$("#dialog-torrent-changeDownloadDir");if(a.length){a.dialog("open");a.data("ids",b);a.dialog({content:system.templates["dialog-torrent-changeDownloadDir.html"]})}else{$("<div/>").attr("id","dialog-torrent-changeDownloadDir").appendTo(document.body).dialog({title:system.lang.dialog["torrent-changeDownloadDir"].title,
width:520,height:180,resizable:false,cache:true,content:"loading...",modal:true});$.get("template/dialog-torrent-changeDownloadDir.html?time="+new Date,function(d){system.templates["dialog-torrent-changeDownloadDir.html"]=d;$("#dialog-torrent-changeDownloadDir").data("ids",b);$("#dialog-torrent-changeDownloadDir").dialog({content:d})})}}});this.panel.toolbar.find("#toolbar_alt_speed").linkbutton().attr("title",this.lang.toolbar.tip["alt-speed"]).click(function(){var a=$(this),b=false;if(a.linkbutton("options").iconCls==
"icon-alt-speed-false")b=true;transmission.exec({method:"session-set",arguments:{"alt-speed-enabled":b}},function(c){if(c.result=="success"){system.serverConfig["alt-speed-enabled"]=b;a.linkbutton({iconCls:"icon-alt-speed-"+b.toString()});b?$("#status_alt_speed").show():$("#status_alt_speed").hide()}});a.linkbutton({iconCls:"icon-loading"})});this.panel.toolbar.find("#toolbar_config").linkbutton().attr("title",this.lang.toolbar.tip["system-config"]).click(function(){var a=$("#dialog-system-config");
if(a.length){a.dialog("open");a.dialog({content:system.templates["dialog-system-config.html"]})}else{$("<div/>").attr("id","dialog-system-config").appendTo(document.body).dialog({title:system.lang.toolbar["system-config"],width:620,height:400,resizable:true,cache:false,content:"loading...",modal:true});$.get("template/dialog-system-config.html?time="+new Date,function(b){system.templates["dialog-system-config.html"]=b;$("#dialog-system-config").dialog({content:b})})}});this.panel.toolbar.find("#toolbar_reload").linkbutton().attr("title",
this.lang.toolbar.tip["system-reload"]).click(function(){system.reloadData()});this.panel.toolbar.find("#toolbar_search").searchbox({searcher:function(a){system.searchTorrents(a)},prompt:this.lang.toolbar["search-prompt"]})},initStatusBar:function(){this.panel.statusbar.find("#status_title_downloadspeed").html(this.lang.statusbar.downloadspeed);this.panel.statusbar.find("#status_title_uploadspeed").html(this.lang.statusbar.uploadspeed)},connect:function(){this.showStatus(this.lang.system.status.connect,
0);transmission.on.torrentCountChange=function(){system.reloadTorrentBaseInfos()};transmission.on.postError=function(){};transmission.init({islocal:true},function(){system.reloadSession(true);system.getServerStatus()})},reloadSession:function(a){transmission.getSession(function(b){system.serverConfig=b;$("#status_version").html("Transmission "+system.lang.statusbar.version+b.version+", RPC: "+b["rpc-version"]);if(b["alt-speed-enabled"]==true){system.panel.toolbar.find("#toolbar_alt_speed").linkbutton({iconCls:"icon-alt-speed-true"});
$("#status_alt_speed").show()}else{system.panel.toolbar.find("#toolbar_alt_speed").linkbutton({iconCls:"icon-alt-speed-false"});$("#status_alt_speed").hide()}system.downloadDir=b["download-dir"];b=system.serverConfig["download-dir-free-space"];b=b==-1?system.lang["public"]["text-unknown"]:formatSize(b);$("#status_freespace").text(system.lang.dialog["system-config"]["download-dir-free-space"]+" "+b);a&&system.showStatus(system.lang.system.status.connected)})},reloadTorrentBaseInfos:function(a){if(!this.reloading){clearTimeout(this.autoReloadTimer);
this.reloading=true;var b={trackers:transmission.trackers,folders:transmission.torrents.folders};transmission.torrents.getallids(function(c){var d=[],e;for(e in c)d.push(c[e].id);c=transmission.torrents.getErrorIds(d,true);c.length>0?transmission.torrents.getallids(function(){system.resetTorrentInfos(b)},c):system.resetTorrentInfos(b)},a)}},resetTorrentInfos:function(a){var b=this.currentTorrentId,c=this.panel.left.tree("find","servers");if(c)this.removeTreeNode("servers-loading");else{this.appendTreeNode(null,
[{id:"servers",text:this.lang.tree.servers,iconCls:"icon-servers"}]);c=this.panel.left.tree("find","servers")}for(var d in transmission.trackers){var e=transmission.trackers[d],f=system.panel.left.tree("find",e.nodeid),g=e.name+this.showNodeMoreInfos(e.count,e.size);f?system.updateTreeNodeText(e.nodeid,g,e.connected?"icon-server":"icon-server-error"):system.appendTreeNode(c,[{id:e.nodeid,text:g,iconCls:e.connected?"icon-server":"icon-server-error"}]);a.trackers[e.nodeid]=null}for(d in a.trackers)(e=
a.trackers[d])&&system.removeTreeNode(e.nodeid);transmission.torrents.status[transmission._status.stopped]?system.updateTreeNodeText("paused",system.lang.tree.paused+this.showNodeMoreInfos(transmission.torrents.status[transmission._status.stopped].length)):system.updateTreeNodeText("paused",system.lang.tree.paused);transmission.torrents.status[transmission._status.seed]?system.updateTreeNodeText("sending",system.lang.tree.sending+this.showNodeMoreInfos(transmission.torrents.status[transmission._status.seed].length)):
system.updateTreeNodeText("sending",system.lang.tree.sending);if(transmission.torrents.status[transmission._status.seedwait]){f=system.panel.left.tree("find","sending");c=system.panel.left.tree("getChildren",f.target);g=system.lang.tree.wait+this.showNodeMoreInfos(transmission.torrents.status[transmission._status.seedwait].length);c.length>0?system.updateTreeNodeText(c[0].id,g):system.appendTreeNode(f,[{id:"seedwait",text:g,iconCls:"icon-wait"}])}else system.removeTreeNode("seedwait");transmission.torrents.status[transmission._status.check]?
system.updateTreeNodeText("check",system.lang.tree.check+this.showNodeMoreInfos(transmission.torrents.status[transmission._status.check].length)):system.updateTreeNodeText("check",system.lang.tree.check);if(transmission.torrents.status[transmission._status.checkwait]){f=system.panel.left.tree("find","check");c=system.panel.left.tree("getChildren",f.target);g=system.lang.tree.wait+this.showNodeMoreInfos(transmission.torrents.status[transmission._status.checkwait].length);c.length>0?system.updateTreeNodeText(c[0].id,
g):system.appendTreeNode(f,[{id:"checkwait",text:g,iconCls:"icon-wait"}])}else system.removeTreeNode("checkwait");transmission.torrents.status[transmission._status.download]?system.updateTreeNodeText("downloading",system.lang.tree.downloading+this.showNodeMoreInfos(transmission.torrents.status[transmission._status.download].length)):system.updateTreeNodeText("downloading",system.lang.tree.downloading);if(transmission.torrents.status[transmission._status.downloadwait]){f=system.panel.left.tree("find",
"downloading");c=system.panel.left.tree("getChildren",f.target);g=system.lang.tree.wait+this.showNodeMoreInfos(transmission.torrents.status[transmission._status.downloadwait].length);c.length>0?system.updateTreeNodeText(c[0].id,g):system.appendTreeNode(f,[{id:"downloadwait",text:g,iconCls:"icon-wait"}])}else system.removeTreeNode("downloadwait");system.updateTreeNodeText("actively",system.lang.tree.actively+this.showNodeMoreInfos(transmission.torrents.actively.length));system.updateTreeNodeText("error",
system.lang.tree.error+this.showNodeMoreInfos(transmission.torrents.error.length));system.updateTreeNodeText("warning",system.lang.tree.warning+this.showNodeMoreInfos(transmission.torrents.warning.length));f=system.panel.left.tree("getSelected");if(f!=null){g=system.control.torrentlist.datagrid("options").pageNumber;system.loadTorrentToList({node:f,page:g})}b!=0&&system.control.torrentlist.datagrid("selectRecord",b);system.reloading=false;if(system.config.autoReload)system.autoReloadTimer=setTimeout(function(){system.reloadData()},
system.config.reloadStep);system.updateTreeNodeText("torrent-all",system.lang.tree.all+this.showNodeMoreInfos(transmission.torrents.count,transmission.torrents.totalSize));b="uploadedBytes,downloadedBytes,filesAdded,sessionCount,secondsActive".split(",");$.each(b,function(i,h){switch(h){case "uploadedBytes":case "downloadedBytes":system.updateTreeNodeText(h,system.lang.tree.statistics[h]+formatSize(system.serverSessionStats["cumulative-stats"][h]));system.updateTreeNodeText("current-"+h,system.lang.tree.statistics[h]+
formatSize(system.serverSessionStats["current-stats"][h]));break;case "secondsActive":system.updateTreeNodeText(h,system.lang.tree.statistics[h]+getTotalTime(system.serverSessionStats["cumulative-stats"][h]*1E3));system.updateTreeNodeText("current-"+h,system.lang.tree.statistics[h]+getTotalTime(system.serverSessionStats["current-stats"][h]*1E3));break;default:system.updateTreeNodeText(h,system.lang.tree.statistics[h]+system.serverSessionStats["cumulative-stats"][h]);system.updateTreeNodeText("current-"+
h,system.lang.tree.statistics[h]+system.serverSessionStats["current-stats"][h])}});for(d in transmission.torrents.folders)a.folders[transmission.torrents.folders[d].nodeid]=null;this.loadFolderList(a.folders);navigator.userAgent.indexOf("Firefox")>0&&system.panel.left.find("span.nav-total-size").css({"margin-top":"-19px"})},showNodeMoreInfos:function(a,b){var c="";if(a>0)c=" <span class='nav-torrents-number'>("+a+")</span>";if(b>0)c+="<span class='nav-total-size'>["+formatSize(b)+"]</span>";return c},
getServerStatus:function(){if(!this.reloading){clearTimeout(this.autoReloadTimer);this.reloading=true;transmission.getStatus(function(a){system.reloading=false;$("#status_downloadspeed").html(formatSize(a.downloadSpeed,false,"speed"));$("#status_uploadspeed").html(formatSize(a.uploadSpeed,false,"speed"));system.serverSessionStats=a;if(a.torrentCount==0){(a=system.panel.left.tree("find","servers"))&&system.panel.left.tree("remove",a.target);system.updateTreeNodeText("torrent-all",system.lang.tree.all)}})}},
showStatus:function(a,b){$("#m_status").panel("options").collapsed&&$("#layout_left").layout("expand","south");this.panel.status_text.show();this.panel.status_text.html(a);if(b!=0){if(b==undefined)b=3E3;this.panel.status_text.fadeOut(b,function(){$("#layout_left").layout("collapse","south")})}},updateTreeNodeText:function(a,b,c){if(a=this.panel.left.tree("find",a)){b={target:a.target,text:b};if(c!=undefined)b.iconCls=c;this.panel.left.tree("update",b)}},appendTreeNode:function(a,b){var c=null;(c=
typeof a=="string"?this.panel.left.tree("find",a):a)?this.panel.left.tree("append",{parent:c.target,data:b}):this.panel.left.tree("append",{data:b})},removeTreeNode:function(a){(a=this.panel.left.tree("find",a))&&this.panel.left.tree("remove",a.target)},loadTorrentToList:function(a){if(transmission.torrents.all){jQuery.extend({node:null,page:1},a);if(a.node){var b=null,c=this.panel.left.tree("getParent",a.node.target)||{id:""},d=this.panel.left.data("currentNodeId");if(d!=a.node.id){this.control.torrentlist.datagrid({pageNumber:1});
d=a.node.id}this.panel.left.data("currentNodeId",d);switch(c.id){case "servers":b=transmission.trackers[a.node.id].torrents;break;default:switch(a.node.id){case "torrent-all":case "servers":b=transmission.torrents.all;break;case "paused":b=transmission.torrents.status[transmission._status.stopped];break;case "sending":b=transmission.torrents.status[transmission._status.seed];break;case "seedwait":b=transmission.torrents.status[transmission._status.seedwait];break;case "check":b=transmission.torrents.status[transmission._status.check];
break;case "checkwait":b=transmission.torrents.status[transmission._status.checkwait];break;case "downloading":b=transmission.torrents.status[transmission._status.download];break;case "downloadwait":b=transmission.torrents.status[transmission._status.downloadwait];break;case "actively":b=transmission.torrents.actively;break;case "error":b=transmission.torrents.error;break;case "warning":b=transmission.torrents.warning;break;case "search-result":b=transmission.torrents.searchResult;break;default:if(a.node.id.indexOf("folders-")!=
-1)if(c=transmission.torrents.folders[a.node.id])b=c.torrents}}this.config.defaultSelectNode=a.node.id;this.saveConfig();a=[];for(var e in b){if(!b[e])return;c=parseFloat(b[e].percentDone*100).toFixed(2);d=this.lang.torrent["status-text"][b[e].status];if(b[e].error!=0)d="<span class='text-status-error'>"+d+"</span>";else if(b[e].warning)d="<span class='text-status-warning' title='"+b[e].warning+"'>"+d+"</span>";a.push({id:b[e].id,name:this.getTorrentNameBar(b[e]),totalSize:b[e].totalSize,percentDone:this.getTorrentProgressBar(c,
b[e]),percentDoneNumber:c,status:d,addedDate:formatLongTime(b[e].addedDate),completeSize:b[e].totalSize-b[e].leftUntilDone,rateDownload:b[e].rateDownload,rateUpload:b[e].rateUpload,leecherCount:b[e].leecher,seederCount:b[e].seeder,uploadRatio:b[e].uploadRatio,uploadedEver:b[e].uploadedEver})}this.panel.toolbar.find("#toolbar_start").linkbutton({disabled:true});this.panel.toolbar.find("#toolbar_pause").linkbutton({disabled:true});this.panel.toolbar.find("#toolbar_remove").linkbutton({disabled:true});
this.panel.toolbar.find("#toolbar_recheck").linkbutton({disabled:true});b=this.control.torrentlist.datagrid("options");if(b.sortName){e=b.sortName;if(e=="percentDone")e="percentDoneNumber";a=a.sort(arrayObjectSort(e,b.sortOrder))}this.control.torrentlist.datagrid({loadFilter:pagerFilter,pageNumber:b.pageNumber,sortName:b.sortName,sortOrder:b.sortOrder}).datagrid("loadData",a)}}},getTorrentNameBar:function(a){var b="",c=a.name;switch(a.status){case transmission._status.stopped:b="iconlabel icon-pause-small";
break;case transmission._status.check:b="iconlabel icon-checking";break;case transmission._status.download:b="iconlabel icon-down";break;case transmission._status.seed:b="iconlabel icon-up";break;case transmission._status.seedwait:case transmission._status.downloadwait:case transmission._status.checkwait:b="iconlabel icon-wait"}if(a.warning){b="iconlabel icon-warning-type1";c+="\n\n"+this.lang["public"]["text-info"]+": "+a.warning}if(a.error!=0){b="iconlabel icon-exclamation";c+="\n\n"+this.lang["public"]["text-info"]+
": "+a.errorString}return'<span class="'+b+'" title="'+c+'">'+a.name+"</span>"},getTorrentProgressBar:function(a,b){a+="%";var c="",d=0;d=typeof b=="object"?b.status:b;switch(d){case transmission._status.stopped:c="torrent-progress-stop";break;case transmission._status.checkwait:case transmission._status.check:c="torrent-progress-check";break;case transmission._status.downloadwait:case transmission._status.download:c="torrent-progress-download";break;case transmission._status.seedwait:case transmission._status.seed:c=
"torrent-progress-seed"}if(typeof b=="object"){if(b.warning)c="torrent-progress-warning";if(b.error!=0)c="torrent-progress-error"}return'<div class="torrent-progress" title="'+a+'"><div class="torrent-progress-text">'+a+'</div><div class="torrent-progress-bar '+c+'" style="width:'+a+';"></div></div>'},addTorrentsToServer:function(a,b,c,d){var e=b-a.length,f=a.shift();if(f){this.showStatus(this.lang.system.status.queue+(e+1)+"/"+b+"<br/>"+f,0);transmission.addTorrentFromUrl(f,d,c,function(){system.addTorrentsToServer(a,
b,c,d)})}else{this.showStatus(this.lang.system.status.queuefinish);this.getServerStatus()}},changeSelectedTorrentStatus:function(a,b){var c=this.control.torrentlist.datagrid("getChecked"),d=[];a||(a="start");for(var e in c)d.push(c[e].id);if(d.length>0){var f=b.linkbutton("options").iconCls;b.linkbutton({disabled:true,iconCls:"icon-loading"});transmission.exec({method:"torrent-"+a,arguments:{ids:d}},function(g){g.result=="success"&&system.panel.toolbar.find("#toolbar_start").linkbutton({disabled:true});
b.linkbutton({iconCls:f});system.control.torrentlist.datagrid("uncheckAll");system.reloadTorrentBaseInfos()})}},searchTorrents:function(a){if(a!=""){var b=transmission.torrents.search(a);if(b==null||b.length==0)this.removeTreeNode("search-result");else{var c=this.panel.left.tree("find","search-result");a=this.lang.tree["search-result"]+" : "+a+" ("+b.length+")";if(c==null){this.appendTreeNode("torrent-all",[{id:"search-result",text:a,iconCls:"icon-search"}]);c=this.panel.left.tree("find","search-result")}else this.panel.left.tree("update",
{target:c.target,text:a});this.panel.left.tree("select",c.target)}}},getTorrentInfos:function(a){if(!transmission.torrents.all[a].infoIsLoading){if(this.currentTorrentId>0)if(transmission.torrents.all[this.currentTorrentId].infoIsLoading)return;this.currentTorrentId=a;if(!this.panel.attribute.panel("options").collapsed){this.panel.attribute.panel({iconCls:"icon-loading"});var b=transmission.torrents.all[a];b.infoIsLoading=true;var c="fileStats,trackerStats,peers,leftUntilDone,status,rateDownload,rateUpload,uploadedEver,uploadRatio,error,errorString";
b.moreInfosTag||(c+=",files,trackers,comment,dateCreated,creator,downloadDir");transmission.torrents.getMoreInfos(c,a,function(d){b.infoIsLoading=false;system.panel.attribute.panel({iconCls:""});if(d!=null){jQuery.extend(b,d[0]);if(system.currentTorrentId==0)system.clearTorrentAttribute();else{b.completeSize=b.totalSize-b.leftUntilDone;b.moreInfosTag=true;system.fillTorrentBaseInfos(b);system.fillTorrentFileList(b);system.fillTorrentServerList(b);system.fillTorrentPeersList(b);system.fillTorrentConfig(b);
transmission.torrents.all[a]=b;transmission.torrents.datas[a]=b}}})}}},clearTorrentAttribute:function(){system.panel.attribute.find("#torrent-files-table").datagrid("loadData",[]);system.panel.attribute.find("#torrent-servers-table").datagrid("loadData",[]);system.panel.attribute.find("#torrent-peers-table").datagrid("loadData",[]);system.panel.attribute.find("span[id*='torrent-attribute-value']").html("")},fillTorrentBaseInfos:function(a){$.each(a,function(b,c){switch(b){case "rateDownload":case "rateUpload":c=
formatSize(c,true,"speed");break;case "totalSize":case "uploadedEver":case "leftUntilDone":case "completeSize":c=formatSize(c);break;case "addedDate":case "dateCreated":c=formatLongTime(c);break;case "status":c=system.lang.torrent["status-text"][c];break;case "error":c==0?system.panel.attribute.find("#torrent-attribute-tr-error").hide():system.panel.attribute.find("#torrent-attribute-tr-error").show();break;case "comment":c=system.replaceURI(c)}system.panel.attribute.find("#torrent-attribute-value-"+
b).html(c)})},fillTorrentFileList:function(a){var b=a.files,c=a.fileStats,d=[],e=a.name.length+1,f;for(f in b){var g=b[f],i=c[f],h=parseFloat(i.bytesCompleted/g.length*100).toFixed(2);d.push({name:g.name==a.name?g.name:g.name.substr(e),index:f,bytesCompleted:i.bytesCompleted,percentDone:system.getTorrentProgressBar(h,transmission._status.download),length:g.length,wanted:system.lang.torrent.attribute.status[i.wanted],priority:'<span class="iconlabel icon-flag-'+i.priority+'">'+system.lang.torrent.attribute.priority[i.priority]+
"</span>"})}system.panel.attribute.find("#torrent-files-table").datagrid({loadFilter:pagerFilter,pageNumber:1}).datagrid("loadData",d)},fillTorrentServerList:function(a){var b=a.trackers,c=a.trackerStats,d=[],e;for(e in b){var f=c[e],g={},i;for(i in f)switch(i){case "lastAnnounceTime":case "nextAnnounceTime":g[i]=formatLongTime(f[i]);break;case "lastAnnounceSucceeded":case "lastAnnounceTimedOut":g[i]=system.lang.torrent.attribute.status[f[i]];break;default:g[i]=f[i]}d.push(g)}transmission.torrents.addTracker(a);
system.panel.attribute.find("#torrent-servers-table").datagrid({loadFilter:pagerFilter,pageNumber:1}).datagrid("loadData",d)},fillTorrentPeersList:function(a){a=a.peers;var b=[],c;for(c in a){var d=a[c],e={},f;for(f in d)e[f]=d[f];d=parseFloat(d.progress*100).toFixed(2);e.progress=system.getTorrentProgressBar(d,transmission._status.download);b.push(e)}system.panel.attribute.find("#torrent-peers-table").datagrid({loadFilter:pagerFilter,pageNumber:1}).datagrid("loadData",b)},fillTorrentConfig:function(a){system.panel.attribute.find("#torrent-attribute-tabs").data("selectedIndex")==
4&&transmission.torrents.getConfig(a.id,function(b){if(b!=null){jQuery.extend(transmission.torrents.all[system.currentTorrentId],b[0]);system.currentTorrentId!=0&&$.each(b[0],function(c,d){var e=false,f=false,g=false;switch(c){case "seedIdleMode":case "seedRatioMode":if(d==0){f=false;e=true}g=true;case "downloadLimited":case "uploadLimited":if(d==true||d==1)f=true;system.panel.attribute.find("input[enabledof='"+c+"']").prop("disabled",!f);g&&system.panel.attribute.find("#"+c).prop("indeterminate",
e).data("_tag",d);system.panel.attribute.find("#"+c).prop("checked",f);break;default:system.panel.attribute.find("#"+c).val(d);system.panel.attribute.find("#"+c).numberspinner("setValue",d)}})}})},setFieldFormat:function(a){if(a.formatter)switch(a.formatter){case "size":a.formatter=function(b){return formatSize(b)};break;case "speed":a.formatter=function(b){return formatSize(b,true,"speed")}}},reloadData:function(){this.reloadSession();this.reloading=false;this.getServerStatus();this.reloading=false;
this.reloadTorrentBaseInfos()},loadFolderList:function(a){this.removeTreeNode("folders-loading");for(var b in a){var c=a[b];c&&system.removeTreeNode(c.nodeid)}transmission.downloadDirs.length!=0&&timedChunk(transmission.downloadDirs,this.appendFolder,this,10,function(){navigator.userAgent.indexOf("Firefox")>0&&system.panel.left.find("span.nav-total-size").css({"margin-top":"-19px"})})},appendFolder:function(a){var b="folders";a=a.split("/");var c="folders-",d;for(d in a){var e=a[d];if(e!=""){c+=this.B64.encode(e);
var f=this.panel.left.tree("find",c),g=transmission.torrents.folders[c];e=e+this.showNodeMoreInfos(g.count,g.size);if(f)this.updateTreeNodeText(c,e);else{this.appendTreeNode(b,[{id:c,text:e}]);if(b!="folders"){f=this.panel.left.tree("find",b);this.panel.left.tree("collapse",f.target)}}b=c}}},replaceURI:function(a){return a.replace(/(http|https|ftp):\/\/([^/:]+)(:\d*)?([^# ]*)/ig,function(b){return'<a href="'+b+'" target="_blank">'+b+"</a>"})},readConfig:function(){var a=cookies.get("transmission-web-control");
if($.isPlainObject(a))this.config=$.extend(this.config,a)},saveConfig:function(){cookies.set("transmission-web-control",this.config,100)},debug:function(a,b){window.console&&window.console.log&&window.console.log(a,b)}};$(document).ready(function(){$.getScript("lang/_languages.js",function(){system.init(location.search.getQueryString("lang"),location.search.getQueryString("local"))})});
function pagerFilter(a){if(typeof a.length=="number"&&typeof a.splice=="function")a={total:a.length,rows:a};var b=$(this),c=b.datagrid("options"),d=b.datagrid("getPager"),e=b.data("buttons");d.pagination({onSelectPage:function(g,i){c.pageNumber=g;c.pageSize=i;d.pagination("refresh",{pageNumber:g,pageSize:i});b.datagrid("loadData",a)},buttons:e});if(!a.originalRows)a.originalRows=a.rows;e=(c.pageNumber-1)*parseInt(c.pageSize);var f=e+parseInt(c.pageSize);a.rows=a.originalRows.slice(e,f);return a};