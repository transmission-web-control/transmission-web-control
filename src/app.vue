<template>
  <div class="flex-row justify-between">
    <img
      id="logo"
      src="logo.png"
      alt="LOGO"
      class="order-first"
    />

    <div
      style="float: right; padding: 13px"
      class="order-last"
    >
      <!-- 切换到原版 -->
      <a
        id=""
        href="javascript:location.href = 'index.original.html';"
        class="easyui-linkbutton l-btn l-btn-small l-btn-plain"
        data-options="iconCls:'icon-transmission',plain:true"
        system-tip-lang="toolbar.tip['ui-original']"
        group=""
        title="切换到原版界面"
      >
        <span class="l-btn-left l-btn-icon-left">
          <span class="l-btn-text">
            <span system-lang="toolbar['ui-original']">原版UI</span>
          </span>
          <span class="l-btn-icon"></span
        ></span>
      </a>
      <span class="button-split">|</span>
      <!-- 关于 -->
      <RouterLink
        id="toolbar_about"
        to="/about"
        href="javascript:void(0);"
        class="easyui-linkbutton l-btn l-btn-small l-btn-plain"
        data-options="iconCls:'icon-about',plain:true"
        system-tip-lang="toolbar.about"
        group=""
        title="关于"
      >
        <span class="l-btn-left l-btn-icon-left">
          <span class="l-btn-text"><span system-lang="toolbar.about">关于</span> </span>
          <span class="l-btn-icon icon-about">&nbsp;</span>
        </span>
      </RouterLink>
    </div>
  </div>

  <RouterView></RouterView>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { transmission } from './lib/transmission';

export default defineComponent({
  data() {
    return {
      transmission,
    };
  },
});
</script>

<style></style>
