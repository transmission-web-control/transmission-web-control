<template>
  <div class="mt-5 flex h-full flex-row justify-center align-middle">
    <div class="w-fit" style="min-width: 250px">
      <img id="logo" src="images/logo.png" alt="logo" />
      <div>Transmission: {{ serverInfo.version }}, RPC: {{ serverInfo.rpc }}</div>
      <div id="dialog-about-version">Web Control: {{ APP_VERSION }}</div>
      <div>
        Copyright © 2012-2023
        <a class="text-black no-underline" href="https://github.com/trim21"> trim21 </a>
      </div>

      <div class="flex flex-row justify-around">
        <a
          href="https://github.com/transmission-web-control/transmission-web-control"
          target="_blank"
          title="github"
        >
          <UserButton :border="true" iconfont="tr-icon-github" :text="$t('dialog.about.home')" />
        </a>
        <a
          href="https://github.com/transmission-web-control/transmission-web-control/wiki"
          target="_blank"
          title="github"
        >
          <UserButton :border="true" iconfont="tr-icon-help" :text="$t('dialog.about.help')" />
        </a>

        <a
          href="https://github.com/transmission-web-control/transmission-web-control/releases"
          target="_blank"
          title="github"
        >
          <UserButton
            :border="true"
            iconfont="tr-icon-update"
            :text="$t(`dialog.about.checkUpdate`)"
          />
        </a>
      </div>

      <hr class="my-5" style="color: #444; height: 4px" />

      <div class="flex flex-row">
        <span style="padding-right: 5px">Thanks: </span>
        <a
          id=""
          href="https://www.transmissionbt.com/"
          target="_blank"
          title="Transmission"
          class="easyui-linkbutton l-btn l-btn-small"
          group=""
        >
          <UserButton :border="true" text="Transmission" />
        </a>
      </div>
    </div>
  </div>
</template>
<script setup>
import UserButton from './components/UserButton.vue';
import { APP_VERSION } from './lib/version';
import { useServerInfoStore } from './state';

const serverInfo = useServerInfoStore();
</script>

<style>
div {
  line-height: 25px;
}
</style>
