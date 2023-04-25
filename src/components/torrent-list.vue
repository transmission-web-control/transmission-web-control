<template>
  <div class="layout">
    <div class="head" style="height: 100%; width: 100%">
      <table>
        <thead>
          <tr>
            <th
              v-for="field in fields"
              :key="field.field"
              :style="`width: ${field.width}px`"
              @click="setSort(field.field)"
            >
              {{ $t('torrent.fields.' + field.field) }}
              {{ currentSort === field.field ? sortOrderArrow[currentSortOrder] : '' }}
            </th>
          </tr>
        </thead>
      </table>
    </div>

    <div class="main">
      <table>
        <thead>
          <tr>
            <th v-for="field in fields" :key="field.field" :style="`width: ${field.width}px`" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="torrent in torrentList.torrents.slice(
              userConfig.page * (currentPage - 1),
              userConfig.page * currentPage,
            )"
            :key="torrent.hashString"
          >
            <td v-for="field in fields" :key="field.field" class="tr2-torrent-cell">
              {{ field.valueFormatter?.(torrent[field.field]) ?? torrent[field.field] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="bottom">
      page
      <select v-model="currentPage">
        <option v-for="i in totalPage" :key="i" :value="i">
          {{ i }}
        </option>
      </select>
      / {{ totalPage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import * as lo from 'lodash-es';
import { computed, ref } from 'vue';

import { formatBytes } from '../lib/utils';
import { useTorrentListStore, useUserConfigStore } from '../state';

const torrentList = useTorrentListStore();
const userConfig = useUserConfigStore();

const fields: { field: string; width: number; valueFormatter?: (v: any) => string }[] =
  userConfig.fields.map((x) => {
    if (x.field === 'totalSize') {
      return {
        field: x.field,
        width: x.width,
        valueFormatter: (x: any) => {
          return formatBytes(x as number);
        },
      };
    }
    return { field: x.field, width: x.width };
  });

const currentSort = ref<string | null>(null);
const currentSortOrder = ref<'asc' | 'desc'>('desc');

const sortRevert = { asc: 'desc', desc: 'asc' } as const;
const sortOrderArrow = { asc: ' ↑', desc: ' ↓' };

const totalPage = computed(() => Math.ceil(torrentList.torrents.length / userConfig.page));
const currentPage = ref(1);

const setSort = (v: string) => {
  if (currentSort.value === null) {
    currentSort.value = v;
    currentSortOrder.value = 'desc';
  } else if (currentSort.value === v) {
    if (currentSortOrder.value === 'asc') {
      currentSortOrder.value = 'desc';
      currentSort.value = null;
    } else {
      currentSortOrder.value = sortRevert[currentSortOrder.value];
    }
  }

  torrentList.setValue(
    lo.orderBy(torrentList.torrents, currentSort.value ?? 'id', currentSortOrder.value),
  );
};
</script>

<style scoped>
.layout {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.head {
  flex: 0 0 30px;
  background: #f39322;
}

.main {
  /*flex: 1;*/
  display: block;
  /*flex-direction: column;*/
  overflow: auto;
  overflow-y: scroll;
}

.bottom {
  flex: 0 0 30px;
  background: #c7262f;
}

td.tr2-torrent-cell {
  user-select: none;
  border: solid 2px blue;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  text-align: left;
  display: table-cell;
}

table {
  table-layout: fixed;
  width: 1%;
}

tbody > tr {
  display: table-row;
}

.main thead th {
  height: 0px !important;
  line-height: 0px !important;
  padding-bottom: 0px !important;
  padding-top: 0px !important;
}
</style>
