const fs = require('fs/promises');
const { PDFDocument } = require('pdf-lib');
const { httpError } = require('../utils/errors');

module.exports = async function mergePdf(paths) {
  if (paths.length < 2) throw httpError(400, 'Please select at least two PDF files.');
  const out = await PDFDocument.create();
  for (const p of paths) {
    let src;
    try { src = await PDFDocument.load(await fs.readFile(p)); }
    catch { throw httpError(422, 'One of the files is not a valid PDF (or is password-protected).'); }
    (await out.copyPages(src, src.getPageIndices())).forEach((pg) => out.addPage(pg));
  }
  return { buffer: Buffer.from(await out.save()), filename: 'merged.pdf', type: 'application/pdf' };
};
