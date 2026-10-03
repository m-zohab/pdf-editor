require('dotenv').config(); // must run first so other modules see .env values
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const routes = require('./routes/pdfRoutes');
const { maxMB, maxFiles } = require('./middleware/upload');
const { purgeOld } = require('./utils/cleanup');

const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

const csp = helmet.contentSecurityPolicy.getDefaultDirectives();
delete csp['upgrade-insecure-requests']; // would break plain-HTTP deployments
csp['img-src'] = ["'self'", 'data:', 'blob:'];
app.use(helmet({ contentSecurityPolicy: { directives: csp } }));

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Too many requests. Please try again later.' }
}));
app.get('/api/config', (req, res) => res.json({ maxFileMB: maxMB(), maxFiles: maxFiles() }));
app.use('/api', routes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

app.use(express.static(path.join(__dirname, 'public')));

// Final error handler (mostly Multer / validation errors).
app.use((err, req, res, next) => {
  const map = {
    LIMIT_FILE_SIZE: [413, 'File size exceeds the maximum allowed limit.'],
    LIMIT_FILE_COUNT: [400, 'Too many files selected.'],
    LIMIT_UNEXPECTED_FILE: [400, 'Too many files selected.']
  };
  if (map[err.code]) return res.status(map[err.code][0]).json({ error: map[err.code][1] });
  if (err.expose) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong while processing your file.' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`PDF TOOLKIT running at http://localhost:${port}`));
purgeOld().catch(() => {});
setInterval(() => purgeOld().catch(() => {}), 30 * 60 * 1000).unref();
