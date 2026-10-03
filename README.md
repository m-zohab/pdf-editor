# PDF TOOLKIT

A self-hosted web app with five PDF tools: **Merge PDF, PDF → Word, Word → PDF, PDF → JPG, JPG → PDF**. Built for personal use.

## Tech stack
Node.js 20+, Express, Multer, Helmet, express-rate-limit, pdf-lib (merge / JPG→PDF), pdf-to-img + sharp (PDF→JPG), archiver (ZIP), docx + pdf-parse (text fallback), Tailwind CSS 3, plain HTML/JS frontend.

## Requirements
| Dependency | Needed for | Required? |
|---|---|---|
| Node.js 20+ and npm | everything | Yes |
| **LibreOffice** | Word → PDF (required); PDF → Word (recommended) | See below |
| Poppler / ImageMagick | nothing | **Not needed** (PDF rendering uses pdf.js, images use sharp, both ship prebuilt binaries) |

No paid external API is used.

### Install LibreOffice
- **Ubuntu/Debian:** `sudo apt update && sudo apt install -y libreoffice-writer libreoffice-draw fonts-liberation fonts-dejavu-core fonts-crosextra-carlito fonts-crosextra-caladea`
  (`libreoffice-draw` is what imports PDFs; the font packages give metric-compatible replacements for Calibri/Cambria so Word layouts stay close.)
- **Windows:** `winget install TheDocumentFoundation.LibreOffice` (or download from libreoffice.org). If it is not in `C:\Program Files\LibreOffice`, set `LIBREOFFICE_PATH` in `.env`.
- **macOS:** `brew install --cask libreoffice`, then set `LIBREOFFICE_PATH=/Applications/LibreOffice.app/Contents/MacOS/soffice`.

## Honest conversion notes
- **Word → PDF** uses LibreOffice. Without it, the endpoint returns a clear 501 error. Fidelity is good for normal documents; fonts missing on the server get substituted.
- **PDF → Word**: no pure-Node library reproduces PDF layout. Two engines (`PDF_TO_WORD_ENGINE` in `.env`):
  - `libreoffice` (used by `auto` when installed): editable DOCX that keeps text positions, images and basic styling. Complex layouts often come out as many text frames, so expect to tidy it up.
  - `text` (fallback): plain paragraphs only, no images, tables or layout. Scanned PDFs are rejected (no OCR included).
  - To add another engine (e.g. a self-hosted converter), add a function to `ENGINES` in `services/pdfToWord.js`.
- **PDF → JPG** renders real pages at 2× scale (single page → `.jpg`, several → `.zip`).
- **JPG → PDF** embeds the real images, one per page, in displayed order.

## Install and run locally
```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev               # builds CSS, starts http://localhost:3000 (auto-restarts on changes)
```

## Production
```bash
npm install
npm run build             # compiles Tailwind CSS
npm start
```
VPS example (Ubuntu): install Node 20 (nodesource), LibreOffice (above), copy the project, then
```bash
sudo npm i -g pm2
cp .env.example .env      # set TRUST_PROXY=true when behind nginx
pm2 start server.js --name pdf-toolkit && pm2 save && pm2 startup
```
nginx reverse proxy (add HTTPS with certbot):
```nginx
server {
  server_name your.domain;
  client_max_body_size 300m;   # MAX_FILES x MAX_FILE_MB
  location / { proxy_pass http://127.0.0.1:3000; proxy_read_timeout 300s; }
}
```
Node PaaS hosts (Render, Railway, etc.): build command `npm install && npm run build`, start command `npm start`. Word → PDF and the PDF → Word LibreOffice engine need LibreOffice in the image, so use a Dockerfile or a VPS for those two. Use a host with enough RAM (≥1 GB) for PDF → JPG.

**Protect it:** this app has no login. If it is on the public internet, put it behind HTTP basic auth, a VPN, or Cloudflare Access.

## API
All endpoints take `multipart/form-data` and return the file on success, or `{ "error": "message" }` with a 4xx/5xx status.

| Method & path | Field | Notes |
|---|---|---|
| POST `/api/pdf/merge` | `files` (≥2 PDFs) | Merged in upload order |
| POST `/api/pdf-to-word` | `file` (PDF) | Returns `.docx` |
| POST `/api/word-to-pdf` | `file` (.doc/.docx) | Needs LibreOffice |
| POST `/api/pdf-to-jpg` | `file` (PDF) | `.jpg` or `.zip`; header `X-Page-Count` |
| POST `/api/jpg-to-pdf` | `files` (JPG/JPEG) | Upload order = page order |
| GET `/api/config` | | Current upload limits |

## Limits (`.env`)
`MAX_FILE_MB` (25), `MAX_FILES` (10), `MAX_PAGES` for PDF → JPG (100), `RATE_LIMIT_MAX` requests per 15 min per IP (100).

## Troubleshooting
- **501 "needs LibreOffice"**: install it, check `soffice --version`, restart the app, or set `LIBREOFFICE_PATH`.
- **`sharp` / `@napi-rs/canvas` install errors**: use Node 20+ and a normal glibc Linux (Alpine needs extra packages).
- **Upload fails with 413 on a server**: raise nginx `client_max_body_size`.
- **Styles missing**: run `npm run build`.
- **PDF reported corrupted**: password-protected PDFs are not supported.

## Security notes
Whitelisted extension and MIME type; size, count and rate limits; random temp filenames (original names are never used on disk); temp folder outside `public/`; files deleted in `finally` plus an hourly sweep of stale files; Helmet headers and CSP; raw errors are logged server-side only; no server paths are sent to the browser.
