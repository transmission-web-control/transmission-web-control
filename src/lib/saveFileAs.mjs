import { saveAs } from 'file-saver';

/**
 * 将指定的内容保存为文件
 * @param fileName 文件名
 * @param fileData 文件内容
 */
export function saveFileAs(fileName, fileData) {
  try {
    var Blob = window.Blob || window.WebKitBlob;

    // Detect availability of the Blob constructor.
    var constructor_supported = false;
    if (Blob) {
      try {
        new Blob([], {
          type: 'text/plain',
        });
        constructor_supported = true;
      } catch (_) {}
    }

    var b = null;
    if (constructor_supported) {
      b = new Blob([fileData], {
        type: 'text/plain',
      });
    } else {
      // Deprecated BlobBuilder API
      var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder;
      var bb = new BlobBuilder();
      bb.append(fileData);
      b = bb.getBlob('text/plain');
    }

    saveAs(b, fileName);
  } catch (e) {
    console.log(e.toString());
  }
}
