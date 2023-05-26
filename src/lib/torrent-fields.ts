export interface Field {
  field: string;
  width?: number;
  align?: string;
  checkbox?: boolean;
  sortable?: boolean;
  allowCustom?: boolean;
  formatter_type?: string;
}

export default {
  fields: [
    { field: 'name', width: 300, sortable: true, formatter_type: '_usename_' },
    {
      field: 'totalSize',
      width: 80,
      align: 'right',
      sortable: true,
      formatter_type: 'size',
    },
    {
      field: 'percentDone',
      width: 70,
      align: 'center',
      sortable: true,
      formatter_type: 'progress',
    },
    {
      field: 'remainingTime',
      width: 100,
      align: 'right',
      sortable: true,
      formatter_type: 'remainingTime',
    },
    {
      field: 'uploadRatio',
      width: 60,
      align: 'right',
      sortable: true,
      formatter_type: 'ratio',
    },
    { field: 'status', width: 60, align: 'center', sortable: true },
    { field: 'seederCount', width: 60, align: 'left' },
    { field: 'leecherCount', width: 60, align: 'left' },
    {
      field: 'rateDownload',
      width: 80,
      align: 'right',
      sortable: true,
      formatter_type: 'speed',
    },
    {
      field: 'rateUpload',
      width: 80,
      align: 'right',
      sortable: true,
      formatter_type: 'speed',
    },
    {
      field: 'completeSize',
      width: 80,
      align: 'right',
      sortable: true,
      formatter_type: 'size',
    },
    {
      field: 'uploadedEver',
      width: 80,
      align: 'right',
      sortable: true,
      formatter_type: 'size',
    },
    {
      field: 'addedDate',
      width: 130,
      align: 'center',
      sortable: true,
      formatter_type: 'longtime',
    },
    { field: 'id', width: 30, align: 'center', sortable: true },
    { field: 'queuePosition', width: 30, align: 'center', sortable: true },
    { field: 'trackers', width: 100, align: 'left', sortable: true },
    { field: 'downloadDir', width: 200, align: 'left', sortable: true },
    {
      field: 'activityDate',
      width: 130,
      align: 'center',
      sortable: true,
      formatter_type: 'longtime',
    },
    { field: 'labels', width: 130, align: 'left', formatter_type: 'labels' },
    {
      field: 'doneDate',
      width: 130,
      align: 'center',
      sortable: true,
      formatter_type: 'longtime',
    },
  ] satisfies Field[],
};
