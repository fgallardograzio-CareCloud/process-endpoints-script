const fs = require('fs').promises;
const path = require('path');

module.exports.writeEnvFile = async function (filename, data) {
  await fs.mkdir(path.dirname(filename), {
    recursive: true
  });
  await fs.writeFile(filename, data);
};
