<template>
  <div class="layout">
    <div class="head">
      <table>
        <thead>
          <tr>
            <th
              v-for="field in fields"
              :key="field.field"
              :style="`width: ${field.width}px`"
              @click="e => setSort(e, field.field)"
              @mousedown="(e) => resize(e, field, 'mousedown')"
              @mouseup="(e) => resize(e, field, 'mouseup')"
              @keyup="(e) => resize(e, field, 'keyup')"
              @resize="(e) => resize(e, field, 'resize')"
            >
              {{ lo.get(lang.torrent.fields, field.field) }}
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
            :class="{ selected: selectedTorrent.has(torrent.hashString) }"
            @click="setSelected(torrent)"
          >
            <template v-for="field in fields" :key="field.field">
              <td v-if="field.formatter_type === 'progress'" class="tr2-torrent-cell">
                {{ torrent[field.field] * 100 }} %
              </td>
              <td v-else class="tr2-torrent-cell">
                {{ field.valueFormatter?.(torrent[field.field]) ?? torrent[field.field] }}
              </td>
            </template>
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

import { lang } from '../i18n.ts';
import { getFormatter } from '../lib/formatter.ts';
import type { Field } from '../lib/torrent-fields.ts';
import torrentFields from '../lib/torrent-fields.ts';
import type { Torrent } from '../lib/transmission.ts';
import { useTorrentListStore, useUserConfigStore } from '../state';

const torrentList = useTorrentListStore();
const userConfig = useUserConfigStore();

const fields = ref(
  torrentFields.fields.slice(1).map((x) => {
    return {
      field: x.field,
      width: x.width ?? 100,
      formatter_type: x.formatter_type,
      valueFormatter: getFormatter(x.formatter_type),
    };
  }) as {
    field: string;
    width: number;
    formatter_type?: string;
    valueFormatter?: (v: any) => string;
  }[],
);

const selectedTorrent = ref<Set<string>>(new Set());
const currentSort = ref<string | null>(null);
const currentSortOrder = ref<'asc' | 'desc'>('desc');

const sortRevert = { asc: 'desc', desc: 'asc' } as const;
const sortOrderArrow = { asc: ' ↑', desc: ' ↓' };

const totalPage = computed(() => Math.ceil(torrentList.torrents.length / userConfig.page));
const currentPage = ref(1);

const setSort = (e: MouseEvent, v: string) => {
  const el = e.target as HTMLElement;
  if (el.offsetWidth - e.offsetX < 20) {
    return;
  }

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
  } else {
    currentSort.value = v;
    currentSortOrder.value = 'desc';
  }

  torrentList.setValue(
    lo.orderBy(torrentList.torrents, currentSort.value ?? 'id', currentSortOrder.value),
  );
};

const setSelected = (t: Torrent) => {
  if (selectedTorrent.value.has(t.hashString)) {
    selectedTorrent.value.delete(t.hashString);
  } else {
    selectedTorrent.value.add(t.hashString);
  }
};

const resize = (e: MouseEvent, f: Field, n: string) => {
  const el = e.target as HTMLElement;

  const width = el?.offsetWidth as number;

  if (width) {
    f.width = width;
  }

  console.log(n);
};
</script>

<style scoped lang="less">
.layout * {
  font-family: Consolas, monospace;
}

.layout {
  user-select: none;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: scroll;
}

.head {
  flex: 0 0 10px;
}

.head thead tr.col-resize {
  cursor: e-resize;
}

.head thead tr th {
  height: 5px;
  resize: horizontal;
  border: solid 2px grey;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  //box-sizing: border-box;
  /*;*/
}

.head thead tr th,
.main thead tr th {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.main {
  user-select: none;
  height: 100%;
  /*flex: 1;*/
  display: block;
  /*flex-direction: column;*/
  overflow: auto;
}

.bottom {
  flex: 0 0 20px;
  background: #c7262f;
}

td.tr2-torrent-cell {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  user-select: none;
  border: solid 2px blue;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  text-align: left;
}

table {
  table-layout: fixed;
  width: 1%;
}

tbody > tr.selected {
  background: blue;
}

.main thead th {
  height: 0px;
  line-height: 0px;
  padding-bottom: 0px;
  padding-top: 0px;
}
</style>
