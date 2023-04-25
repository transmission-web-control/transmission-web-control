<template>
  <div id="m_body">
    <table>
      <thead>
        <tr>
          <th style="width: 100px">{{ $t('torrent.fields.name') }}</th>
          <th style="width: 200px">{{ $t('torrent.fields.totalSize') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="torrent in transmission.torrents.allTorrents()" :key="torrent.hashString">
          <th>{{ torrent.name }}</th>
          <th>{{ torrent.totalSize }}</th>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  data() {
    return {
      transmission,
      system,
    };
  },
});
</script>

<style></style>
