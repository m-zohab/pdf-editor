const sharp = require('sharp');
const archiver = require('archiver');
const { httpError } = require('../utils/errors');

module.exports = async function pdfToJpg([file]) {
  const { pdf } = await import('pdf-to-img'); // ESM-only package
  const maxPages = Number(process.env.MAX_PAGES) || 100;
  const pages = [];
  try {
    const doc = await pdf(file, { scale: 2 });
    if (doc.length > maxPages) throw httpError(413, `This PDF has too many pages (limit ${maxPages}).`);
    for await (const png of doc) {
      pages.push(await sharp(png).flatten({ background: '#ffffff' }).jpeg({ quality: 90 }).toBuffer());
    }
  } catch (err) {
    if (err.expose) throw err;
    throw httpError(422, 'Could not read this PDF. It may be corrupted or password-protected.');
  }
  if (pages.length === 1) return { buffer: pages[0], filename: 'page-1.jpg', type: 'image/jpeg', pages: 1 };

  const zip = archiver('zip');
  const chunks = [];
  zip.on('data', (c) => chunks.push(c));
  const done = new Promise((ok, no) => { zip.on('end', ok); zip.on('error', no); });
  pages.forEach((buf, i) => zip.append(buf, { name: `page-${i + 1}.jpg` }));
  await zip.finalize();
  await done;
  return { buffer: Buffer.concat(chunks), filename: 'pages.zip', type: 'application/zip', pages: pages.length };
};
