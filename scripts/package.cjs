const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version;
const buildDir = 'dist';
const outputDir = 'build';
const zipName = `traffic-blocker-${version}.zip`;
const zipPath = path.join(outputDir, zipName);

console.log(`Packaging traffic-blocker v${version}...`);

if (!fs.existsSync(buildDir)) {
  console.error(`Error: ${buildDir}/ does not exist. Run 'npm run build' first.`);
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const zip = new JSZip();

const addDirToZip = (dirPath, zipPathPrefix = '') => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const zipPathItem = path.join(zipPathPrefix, entry.name);
    if (entry.isDirectory()) {
      addDirToZip(fullPath, zipPathItem);
    } else {
      zip.file(zipPathItem, fs.readFileSync(fullPath));
    }
  }
};

addDirToZip(buildDir, '');

zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } })
  .then((content) => {
    fs.writeFileSync(zipPath, content);
    const sizeKB = (content.length / 1024).toFixed(1);
    console.log(`Created: ${zipPath}`);
    console.log(`Size: ${sizeKB} KB`);
  })
  .catch((err) => {
    console.error('Zip error:', err);
    process.exit(1);
  });
