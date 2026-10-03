const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const { TEMP_DIR, ensureTemp } = require('../utils/cleanup');
const { httpError } = require('../utils/errors');

const RULES = {
  pdf: { ext: ['.pdf'], mime: ['application/pdf'], msg: 'Only PDF files are allowed.' },
  word: {
    ext: ['.doc', '.docx'],
    mime: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    msg: 'Only DOC and DOCX files are allowed.'
  },
  jpg: { ext: ['.jpg', '.jpeg'], mime: ['image/jpeg'], msg: 'Only JPG/JPEG images are allowed.' }
};
const maxMB = () => Number(process.env.MAX_FILE_MB) || 25;
const maxFiles = () => Number(process.env.MAX_FILES) || 10;

// upload('pdf', true) -> accepts several files in field "files"; otherwise one file in field "file".
function upload(kind, multiple = false) {
  const rule = RULES[kind];
  const m = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => ensureTemp().then(() => cb(null, TEMP_DIR), cb),
      // Random name; the extension was already checked against a whitelist.
      filename: (req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase())
    }),
    limits: { fileSize: maxMB() * 1048576, files: multiple ? maxFiles() : 1 },
    fileFilter: (req, file, cb) => {
      const ok = rule.ext.includes(path.extname(file.originalname).toLowerCase()) && rule.mime.includes(file.mimetype);
      cb(ok ? null : httpError(415, rule.msg), ok);
    }
  });
  return multiple ? m.array('files', maxFiles()) : m.single('file');
}
module.exports = { upload, maxMB, maxFiles };
