const fs = require('fs/promises');
const path = require('path');

// Temp folder lives outside /public so it can never be served.
const TEMP_DIR = path.resolve(process.env.TEMP_DIR || path.join(__dirname, '..', 'temp'));
const ensureTemp = () => fs.mkdir(TEMP_DIR, { recursive: true });
const removeFiles = (paths) => Promise.all(paths.map((p) => fs.rm(p, { recursive: true, force: true }).catch(() => {})));

// Safety net: delete anything older than 1 hour (e.g. after a crash).
async function purgeOld(maxAgeMs = 3600e3) {
  await ensureTemp();
  for (const name of await fs.readdir(TEMP_DIR)) {
    if (name === '.gitkeep') continue;
    const p = path.join(TEMP_DIR, name);
    const st = await fs.stat(p).catch(() => null);
    if (st && Date.now() - st.mtimeMs > maxAgeMs) await removeFiles([p]);
  }
}
module.exports = { TEMP_DIR, ensureTemp, removeFiles, purgeOld };
