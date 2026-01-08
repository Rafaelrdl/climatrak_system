import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const configPath = path.join(rootDir, 'config', 'product-structure.json');
const rawConfig = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(rawConfig);

const header = [
  '// This file is auto-generated. Do not edit directly.',
  '// Source: config/product-structure.json',
  '',
].join('\n');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeFile(relativePath, content) {
  const fullPath = path.join(rootDir, relativePath);
  ensureDir(fullPath);
  fs.writeFileSync(fullPath, content, 'utf8');
}

function toTsExport(name, value) {
  return `export const ${name} = ${JSON.stringify(value, null, 2)} as const;\n`;
}

const websiteContent = [
  header,
  toTsExport('marketingNavigation', config.nav),
  toTsExport('personaSections', config.personas),
  toTsExport('marketSegments', config.segments),
  toTsExport('productModules', config.modules),
].join('\n');

const frontendContent = [
  header,
  toTsExport('productModules', config.modules),
  toTsExport('personaSections', config.personas),
  toTsExport('marketSegments', config.segments),
].join('\n');

const mobileContent = [
  header,
  toTsExport('mobileTabs', config.mobile?.tabs ?? []),
  toTsExport('productModules', config.modules),
].join('\n');

writeFile('website/src/content/marketingStructure.ts', websiteContent);
writeFile('frontend/src/shared/marketingStructure.ts', frontendContent);
writeFile('mobile/src/shared/marketingStructure.ts', mobileContent);
writeFile('backend/apps/tenants/marketing_structure.json', `${JSON.stringify(config, null, 2)}\n`);

console.log('Product structure generated successfully.');
