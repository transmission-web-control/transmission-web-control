# Transmission Web Control
![](https://img.shields.io/github/license/ronggang/transmission-web-control.svg)
![[GitHub Releases](https://github.com/transmission-web-control/transmission-web-control/releases)](https://img.shields.io/github/release/transmission-web-control/transmission-web-control.svg)
![Support Transmission Version](https://img.shields.io/badge/transmission-%3E=2.40%20(RPC%20%3E14)-green.svg)

---

# English

## Introduction

Transmission Web Control is a custom web UI. The project was originally written by [ronggang](https://github.com/ronggang/transmission-web-control).
Welcome to give me any feedback or submit a Pull Request.

## Support Transmission Version

Transmission 2.40 and above (RPC version: 14 and above)

## Browsers support

A browser which supports HTML5. (Chrome 15.0.874，Firefox 8.0.1，IE 9.0.8112，Opera 11.52 etc.)

## Features

- Add torrent files or URLs
- Drag-and-drop to add torrent files
- Modify Transmission settings online (Download folder, Speed limit, Port, etc.)
- Pause / resume / recheck selected or all torrents
- View the current torrents status (Files, Peers, Trackers etc.)
- View Statistics (Cumulative/Current)
- Pagination
- Set files priority
- Change the torrent download directory
- Trackers list
- Multi-language support.

## Special feature

- Support data folder display in the navigation bar.
- Support "user label" feature, you can use it to classify torrent.

<!--
## 国内镜像源
- https://gitee.com/culturist/transmission-web-control
-->

## 关于

本项目主要目的是想加强[Transmission](https://www.transmissionbt.com/) Web 的操作能力，本项目原本在[Google Code](https://code.google.com/p/transmission-control/)托管，现迁移至 GitHub。
本项目设计之初仅针对 PT 站，因此增加了 Tracker 服务器分组及状态，但这不并适用于普通 BT 种子。

另外，本项目仅为一套自定义的 WebUI，不能代替 Transmission 工作，用户需要自行安装 Transmission 后才可正常使，Transmission 安装方法请移步至官网：https://www.transmissionbt.com/

## 界面预览

![screenshots](https://user-images.githubusercontent.com/8065899/38598199-0d2e684c-3d8e-11e8-8b21-3cd1f3c7580a.png)

## 安装方法及更多内容，请参考：[中文帮助](https://github.com/ronggang/transmission-web-control/wiki/Home-CN)

### DSM7.0

在这个版本中，需要额外修改权限以实现自动更新的功能
在 `root` 权限下执行以下命令，其中：

- `YOUR_USERNAME` 替换为你登录和更新脚本时候选择的用户
- `/var/packages/transmission/target/share/transmission/web/` 这串路径为 transmission 的安装路径（默认应该是这个）

```shell
sed -i '/sc-transmission/s/$/YOUR_USERNAME/' /etc/group
chown sc-transmission:sc-transmission /var/packages/transmission/target/share/transmission/web/* -R
chmod 774 /var/packages/transmission/target/share/transmission/web/* -R
```

## 更新日志 [查看](https://github.com/ronggang/transmission-web-control/blob/master/CHANGELOG.md)

## 项目日常维护

- 栽培者
- DarkAlexWang
