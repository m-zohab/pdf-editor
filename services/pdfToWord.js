// Engine is replaceable: add another function to ENGINES and set PDF_TO_WORD_ENGINE.
const fs = require('fs/promises');
const { convert, available } = require('./libreoffice');
const { httpError } = require('../utils/errors');

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const ENGINES = {
  // Best layout fidelity: LibreOffice's PDF importer, then export to DOCX.
  libreoffice: (file) => convert(file, { ext: 'docx', filter: 'docx:MS Word 2007 XML' }, 'writer_pdf_import'),

  // Fallback: text only (no layout, images or tables). Scanned PDFs are not supported.
  async text(file) {
    const pdfParse = require('pdf-parse');
    const { Document, Packer, Paragraph, TextRun } = require('docx');
    let data;
    try { data = await pdfParse(await fs.readFile(file)); }
    catch { throw httpError(422, 'Could not read this PDF. It may be corrupted or password-protected.'); }
    if (!data.text.trim()) throw httpError(422, 'This PDF has no selectable text (it may be a scan). OCR is not included.');
    const children = data.text.split(/\r?\n/).map((l) => new Paragraph({ children: [new TextRun(l)] }));
    return Packer.toBuffer(new Document({ sections: [{ children }] }));
  }
};

module.exports = async function pdfToWord([file]) {
  let name = process.env.PDF_TO_WORD_ENGINE || 'auto';
  if (name === 'auto') name = (await available()) ? 'libreoffice' : 'text';
  if (!ENGINES[name]) throw httpError(500, 'Invalid PDF_TO_WORD_ENGINE setting.');
  return { buffer: await ENGINES[name](file), filename: 'document.docx', type: DOCX };
};
