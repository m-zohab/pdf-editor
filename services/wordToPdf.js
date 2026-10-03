const { convert } = require('./libreoffice');

module.exports = async function wordToPdf([file]) {
  const buffer = await convert(file, { ext: 'pdf' });
  return { buffer, filename: 'document.pdf', type: 'application/pdf' };
};
