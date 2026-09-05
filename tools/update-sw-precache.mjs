/* index.html が読み込んでいるファイル一覧から sw.js の CORE（事前キャッシュ）を作り直す。
 *
 *   node tools/update-sw-precache.mjs        … 書き換える
 *   node tools/update-sw-precache.mjs --check … ずれていたら終了コード1（CI用）
 *
 * JS/CSSを増やしたら実行しておくと、オフライン時の取りこぼしを防げる。 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map(m => m[1])
  .filter(u => !/^(https?:)?\/\//.test(u) && !u.startsWith('data:'))
  .filter(u => u !== 'manifest.webmanifest');

const icons = ['icons/favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
               'icons/maskable-192.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'];

const core = ['./', './index.html', './manifest.webmanifest',
              ...assets.map(u => './' + u.replace(/^\.\//, '')),
              ...icons.map(u => './' + u)];

const uniq = [...new Set(core)].filter(u => u === './' || fs.existsSync(path.join(root, u.slice(2))));

const missing = [...new Set(core)].filter(u => !uniq.includes(u));
if (missing.length) console.warn('見つからないファイル（COREから除外）:', missing.join(', '));

const block = 'const CORE = [\n' + uniq.map(u => `  '${u}',`).join('\n') + '\n];';

const swPath = path.join(root, 'sw.js');
const sw = fs.readFileSync(swPath, 'utf8');
const re = /(\/\* precache:start \*\/\n)[\s\S]*?(\n\/\* precache:end \*\/)/;
if (!re.test(sw)) { console.error('sw.js に precache:start / precache:end のマーカーがありません'); process.exit(1); }
const next = sw.replace(re, (_, a, b) => a + block + b);

if (process.argv.includes('--check')) {
  if (next !== sw) { console.error('sw.js の CORE が index.html とずれています。node tools/update-sw-precache.mjs を実行してください。'); process.exit(1); }
  console.log('sw.js の CORE は最新です（' + uniq.length + '件）');
} else {
  fs.writeFileSync(swPath, next);
  console.log('sw.js の CORE を更新しました（' + uniq.length + '件）');
}
