import type enLocal from '../i18n/en.json';

export interface Field {
  field: keyof (typeof enLocal)['torrent']['fields'];
  width?: number;
  align?: string;
  checkbox?: boolean;
  allowCustom?: boolean;
  formatter_type?: string;
}

export default {
  fields: [
    { field: 'id', width: 30, align: 'center' },
    { field: 'queuePosition', width: 30, align: 'center' },
    { field: 'name', width: 300, formatter_type: '_usename_' },
    {
      field: 'totalSize',
      width: 80,
      align: 'right',
      formatter_type: 'size',
    },
    {
      field: 'percentDone',
      width: 70,
      align: 'center',
      formatter_type: 'progress',
    },
    {
      field: 'remainingTime',
      width: 100,
      align: 'right',
      formatter_type: 'remainingTime',
    },
    {
      field: 'uploadRatio',
      width: 60,
      align: 'right',
      formatter_type: 'ratio',
    },
    { field: 'status', width: 60, align: 'center', formatter_type: 'html' },
    { field: 'seederCount', width: 60, align: 'left' },
    { field: 'leecherCount', width: 60, align: 'left' },
    {
      field: 'rateDownload',
      width: 80,
      align: 'right',
      formatter_type: 'speed',
    },
    {
      field: 'rateUpload',
      width: 80,
      align: 'right',
      formatter_type: 'speed',
    },
    {
      field: 'completeSize',
      width: 80,
      align: 'right',
      formatter_type: 'size',
    },
    {
      field: 'uploadedEver',
      width: 80,
      align: 'right',
      formatter_type: 'size',
    },
    {
      field: 'addedDate',
      width: 130,
      align: 'center',
      formatter_type: 'longtime',
    },
    { field: 'trackers', width: 100, align: 'left' },
    { field: 'downloadDir', width: 200, align: 'left' },
    {
      field: 'activityDate',
      width: 130,
      align: 'center',
      formatter_type: 'longtime',
    },
    { field: 'labels', width: 130, align: 'left', formatter_type: 'labels' },
    {
      field: 'doneDate',
      width: 130,
      align: 'center',
      formatter_type: 'longtime',
    },
  ] satisfies Field[],
};
