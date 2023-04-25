<template>
  <div :class="{ 'btn-border': border }">
    <div v-if="icon" :class="{ [icon]: true }" class="icon">
      <span style="top: 50%">
        {{ text }}
      </span>
    </div>

    <div v-else-if="iconfont">
      <span class="iconfont" :class="iconfont" />
      <span>{{ text }}</span>
    </div>

    <div v-else>
      <span>{{ text }}</span>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  props: {
    border: Boolean,
    iconfont: String,
    icon: String,
    text: String,
    title: String,
  },
};
</script>

<style lang="less" scoped>
.button {
  -background: url('images/button-split.gif') no-repeat;
  width: 3px;
  height: 24px;
  color: #808080;
}

.icon {
  padding-left: 16+2px;
}

.icon-mobile {
  background: url('images/mobile.png') no-repeat;
}

.icon-transmission {
  background: url('images/transmission.png') no-repeat;
}

.icon-more-peers {
  background: url('images/more-peers.png') no-repeat;
}

.icon-download-update {
  background: url('images/drive-download.png') no-repeat;
}

.icon-queue-move {
  background: url('images/queue-move.png') no-repeat;
}

.icon-queue-move-top {
  background: url('images/queue-move-top.png') no-repeat;
}

.icon-queue-move-up {
  background: url('images/queue-move-up.png') no-repeat;
}

.icon-queue-move-down {
  background: url('images/queue-move-down.png') no-repeat;
}

.icon-queue-move-bottom {
  background: url('images/queue-move-bottom.png') no-repeat;
}

.icon-plugin {
  background: url('images/plugin.png') no-repeat;
}

.icon-target {
  background: url('images/target.png') no-repeat;
}

.icon-ignore {
  background: url('images/ignore.png') no-repeat;
}

.icon-rename {
  background: url('images/rename.png') no-repeat;
}

.btn-border {
  border: 1px solid #dddddd;
  padding-left: 2px;
  padding-right: 2px;
}
</style>
