import * as fsp from 'node:fs/promises';
import * as path from 'node:path';

import * as lo from 'lodash-es';

function omitDeep(obj) {
  lo.forIn(obj, function (value, key) {
    if (lo.isObject(value)) {
      omitDeep(value);
    } else if (value === '') {
      delete obj[key];
    }
  });
}

const i18nDir = './src/i18n';

const files = await fsp.readdir(i18nDir);
for (const file of files.filter((x) => !x.endsWith('en.json'))) {
  const p = path.join(i18nDir, file);
  const content = JSON.parse(await fsp.readFile(p, 'utf-8'));

  omitDeep(content);

  await fsp.writeFile(p, JSON.stringify(content, null, 2));
}
