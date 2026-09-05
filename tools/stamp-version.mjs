/* sw.js の VERSION をデプロイごとの値に置き換える（GitHub Actions から実行）。
 *   node tools/stamp-version.mjs <version>
 * VERSION が変わると古いキャッシュが一掃されるので、確実に新しい版が配られる。 */
import fs from 'node:fs';
import path from 'node:path';

const v = (process.argv[2] || '').trim() || new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
const p = path.resolve(import.meta.dirname, '..', 'sw.js');
const sw = fs.readFileSync(p, 'utf8');
const next = sw.replace(/const VERSION = '[^']*';/, `const VERSION = '${v.replace(/'/g, '')}';`);
if (next === sw) { console.error('sw.js の VERSION 行が見つかりませんでした'); process.exit(1); }
fs.writeFileSync(p, next);
console.log('sw.js VERSION =', v);
