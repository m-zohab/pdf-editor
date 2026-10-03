const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const { httpError } = require('../utils/errors');

module.exports = async function jpgToPdf(paths) {
  const pdf = await PDFDocument.create();
  for (const p of paths) {
    let data, info;
    try {
      // sharp validates the image and applies EXIF rotation so photos are upright.
      ({ data, info } = await sharp(p).rotate().jpeg({ quality: 92 }).toBuffer({ resolveWithObject: true }));
    } catch { throw httpError(422, 'One of the files is not a valid JPG image.'); }
    const img = await pdf.embedJpg(data);
    const w = info.width * 0.75, h = info.height * 0.75; // px -> pt at 96 dpi
    pdf.addPage([w, h]).drawImage(img, { x: 0, y: 0, width: w, height: h });
  }
  return { buffer: Buffer.from(await pdf.save()), filename: 'images.pdf', type: 'application/pdf' };
};
