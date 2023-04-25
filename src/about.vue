<template>
  <div>
    <div class="panel layout-panel layout-panel-center panel-htop">
      <div
        data-options="region:'center'"
        title=""
        class="panel-body panel-body-noheader layout-body"
        id=""
      >
        <div style="">
          <img
            id="logo"
            src="images/logo.png"
            alt="logo"
          />
          <div id="dialog-about-tr-version">Transmission: 4.0.3 (6b0e49bbb2), RPC: 17</div>
          <div id="dialog-about-version">Web Control: {{ APP_VERSION }}</div>
          <div>
            Copyright © 2012-2023
            <a
              class="text-black no-underline"
              href="https://github.com/trim21"
              >trim21</a
            >
          </div>
          <div style="padding: 10px 0 5px 0px">
            <a
              href="https://github.com/transmission-web-control/transmission-web-control"
              target="_blank"
              class="easyui-linkbutton l-btn l-btn-small"
              data-options="iconCls:'iconfont tr-icon-github'"
              system-tip-lang="dialog['about']['home']"
              system-lang="dialog['about']['home']"
              title="项目主页"
              group=""
              id=""
            >
              <span class="l-btn-left l-btn-icon-left">
                <span class="l-btn-text">项目主页</span>
                <span class="l-btn-icon iconfont tr-icon-github">&nbsp;</span>
              </span>
            </a>
            <a
              href="https://github.com/transmission-web-control/transmission-web-control/wiki"
              target="_blank"
              class="easyui-linkbutton l-btn l-btn-small"
              data-options="iconCls:'iconfont tr-icon-help'"
              system-tip-lang="dialog['about']['help']"
              system-lang="dialog['about']['help']"
              title="使用帮助"
              group=""
              id=""
              ><span class="l-btn-left l-btn-icon-left"
                ><span class="l-btn-text">使用帮助</span
                ><span class="l-btn-icon iconfont tr-icon-help">&nbsp;</span></span
              ></a
            >
            <a
              href="https://github.com/transmission-web-control/transmission-web-control/releases"
              target="_blank"
              class="easyui-linkbutton l-btn l-btn-small"
              data-options="iconCls:'iconfont tr-icon-update'"
              system-tip-lang="dialog['about']['check-update']"
              system-lang="dialog['about']['check-update']"
              title="检查更新"
              group=""
              id=""
              ><span class="l-btn-left l-btn-icon-left"
                ><span class="l-btn-text">检查更新</span
                ><span class="l-btn-icon iconfont tr-icon-update">&nbsp;</span></span
              ></a
            >
            <!--        <a-->
            <!--          href="https://github.com/ronggang/PT-Plugin-Plus"-->
            <!--          target="_blank"-->
            <!--          class="easyui-linkbutton"-->
            <!--          data-options="iconCls:'iconfont tr-icon-pt-plugin'"-->
            <!--          system-tip-lang="dialog['about']['pt-plugin']"-->
            <!--          system-lang="dialog['about']['pt-plugin']"-->
            <!--        ></a>-->
            <!--        <br />-->
            <!--        <a-->
            <!--          href="https://github.com/ronggang/transmission-web-control/wiki/Donate"-->
            <!--          target="_blank"-->
            <!--          class="l-btn iconfont iconfont-big tr-icon-aixinjuanzeng"-->
            <!--          system-tip-lang="dialog['about']['donate']"-->
            <!--        ></a>-->
          </div>
          <hr />
          <div style="padding-top: 5px">
            <span>Thanks: </span>
            <a
              href="http://www.transmissionbt.com/"
              target="_blank"
              title="Transmission"
              class="easyui-linkbutton l-btn l-btn-small"
              group=""
              id=""
              ><span class="l-btn-left"><span class="l-btn-text">Transmission</span></span></a
            >
            <a
              href="http://jquery.com/"
              target="_blank"
              title="jQuery"
              class="easyui-linkbutton l-btn l-btn-small"
              group=""
              id=""
              ><span class="l-btn-left"><span class="l-btn-text">jQuery</span></span></a
            >
            <a
              href="http://www.jeasyui.com/"
              target="_blank"
              title="jQuery EasyUI"
              class="easyui-linkbutton l-btn l-btn-small"
              group=""
              id=""
              ><span class="l-btn-left"><span class="l-btn-text">EasyUI</span></span></a
            >
            <a
              href="http://iconfont.cn/"
              target="_blank"
              title="Alimama Iconfont"
              class="easyui-linkbutton l-btn l-btn-small"
              group=""
              id=""
              ><span class="l-btn-left"><span class="l-btn-text">Iconfont</span></span></a
            >
          </div>
        </div>
      </div>
    </div>
    <div class="layout-split-proxy-h"></div>
    <div class="layout-split-proxy-v"></div>
  </div>
</template>

<script setup>
import { APP_VERSION } from './lib/version';
</script>
