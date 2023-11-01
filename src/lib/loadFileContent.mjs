/**
 * 加载指定的文件内容
 */
export function loadFileContent(fileType, callback) {
  $("<input id='file-loadContent' type='file' style='display:none;' multiple='true'/>")
    .on('change', function () {
      var fileSelector = this;
      if (fileSelector.files.length > 0 && fileSelector.files[0].name.length > 0) {
        var files = fileSelector.files;
        var count = files.length;
        var index = 0;
        var r = new FileReader();
        r.onload = function (e) {
          callback?.call(system, e.target.result);
          readFile();
        };
        r.onerror = function () {
          alert('文件加载失败');
          console.log('文件加载失败');
          readFile();
        };

        function readFile(file) {
          if (index == count) {
            $(fileSelector).remove();
            fileSelector.value = '';
            return;
          }
          var file = files[index];
          var lastIndex = file.name.lastIndexOf('.');
          var fix = file.name.slice(lastIndex + 1);

          index++;

          if (fileType) {
            if (fix != fileType) {
              alert('文件类型错误');
              return;
            }
          }

          r.readAsText(file);
        }

        readFile();
      }
    })
    .click();
}
