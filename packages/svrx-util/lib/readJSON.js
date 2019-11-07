const fs = require('fs');

module.exports = (filepath) => {
  if (!fs.existsSync(filepath)) {
    return {};
  }
  const content = fs.readFileSync(filepath, 'utf8');
  try {
    return JSON.parse(content.trim());
  } catch (err) {
    err.message += ` (file: ${filepath})`;
    console.error('content buffer: %j', fs.readFileSync(filepath));
    throw err;
  }
};
