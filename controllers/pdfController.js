const { removeFiles } = require('../utils/cleanup');
const { httpError } = require('../utils/errors');

// Wraps a service: validate -> process -> respond -> always delete temp files.
const handle = (service) => async (req, res) => {
  const files = req.files || (req.file ? [req.file] : []);
  const paths = files.map((f) => f.path);
  try {
    if (!files.length) throw httpError(400, 'Please select a file.');
    const r = await service(paths);
    res.set({ 'Content-Type': r.type, 'Content-Disposition': `attachment; filename="${r.filename}"` });
    if (r.pages) res.set('X-Page-Count', String(r.pages));
    res.send(r.buffer);
  } catch (err) {
    console.error(`[${req.path}]`, err); // details stay on the server
    res.status(err.expose ? err.status : 500).json({
      error: err.expose ? err.message : 'Something went wrong while processing your file.'
    });
  } finally {
    await removeFiles(paths);
  }
};

module.exports = {
  merge: handle(require('../services/mergePdf')),
  pdfToWord: handle(require('../services/pdfToWord')),
  wordToPdf: handle(require('../services/wordToPdf')),
  pdfToJpg: handle(require('../services/pdfToJpg')),
  jpgToPdf: handle(require('../services/jpgToPdf'))
};
