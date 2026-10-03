// Shared helper: runs LibreOffice headless in a private temp folder.
const { execFile } = require('child_process');
const { pathToFileURL } = require('url');
const fs = require('fs/promises');
const path = require('path');
const { TEMP_DIR } = require('../utils/cleanup');
const { httpError } = require('../utils/errors');

const exe = () => process.env.LIBREOFFICE_PATH ||
  (process.platform === 'win32' ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe' : 'soffice');
const run = (args, opts) => new Promise((res, rej) => execFile(exe(), args, opts, (e, out) => (e ? rej(e) : res(out))));

let checked;
const available = () => (checked ??= run(['--version'], { timeout: 30000 }).then(() => true, () => false));

// target: { ext: 'pdf' } or { ext: 'docx', filter: 'docx:MS Word 2007 XML' }
async function convert(inputPath, target, infilter) {
  if (!(await available())) throw httpError(501, 'This conversion needs LibreOffice installed on the server. See the README.');
  const work = await fs.mkdtemp(path.join(TEMP_DIR, 'lo-'));
  try {
    const src = path.join(work, 'input' + path.extname(inputPath));
    await fs.copyFile(inputPath, src);
    // A private profile per run avoids "profile locked" errors on parallel requests.
    const args = ['-env:UserInstallation=' + pathToFileURL(path.join(work, 'profile')).href, '--headless', '--norestore'];
    if (infilter) args.push('--infilter=' + infilter);
    args.push('--convert-to', target.filter || target.ext, '--outdir', work, src);
    await run(args, { timeout: 180000 });
    return await fs.readFile(path.join(work, 'input.' + target.ext));
  } catch (err) {
    if (err.expose) throw err;
    console.error('LibreOffice error:', err.message);
    throw httpError(422, 'The conversion failed. The file may be corrupted or unsupported.');
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
}
module.exports = { convert, available };
