const router = require('express').Router();
const { upload } = require('../middleware/upload');
const c = require('../controllers/pdfController');

router.post('/pdf/merge', upload('pdf', true), c.merge);
router.post('/pdf-to-word', upload('pdf'), c.pdfToWord);
router.post('/word-to-pdf', upload('word'), c.wordToPdf);
router.post('/pdf-to-jpg', upload('pdf'), c.pdfToJpg);
router.post('/jpg-to-pdf', upload('jpg', true), c.jpgToPdf);
module.exports = router;
