/**
 * build.js — Script de build para Horivoo
 *
 * 1. Compila TypeScript (src/*.ts → dist/js/*.js)
 * 2. Copia arquivos estáticos para dist/
 *    - Procura em: static/ OU na raiz do projeto
 *
 * Uso: node build.js
 * Ou via npm: npm run build
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const STATIC = path.join(ROOT, 'static');

// Arquivos/pastas estáticos que precisam ir para dist/
const STATIC_ASSETS = [
  'index.html',
  'manifest.json',
  'sw.js',
  'css',
  'icons',
  'sql',
];

// ── Helpers ──────────────────────────────────────────────────────

function log(step, msg) {
  console.log(`\n[${step}] ${msg}`);
}

function rmDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyEntry(srcPath, destPath) {
  if (fs.statSync(srcPath).isDirectory()) {
    copyDir(srcPath, destPath);
  } else {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
  }
}

/**
 * Encontra o caminho de um asset estático.
 * Procura primeiro em static/, depois na raiz.
 */
function findAsset(name) {
  // 1. Procura em static/
  const staticPath = path.join(STATIC, name);
  if (fs.existsSync(staticPath)) return staticPath;

  // 2. Procura na raiz do projeto
  const rootPath = path.join(ROOT, name);
  if (fs.existsSync(rootPath)) return rootPath;

  return null;
}

// ── Step 1: Clean ────────────────────────────────────────────────

log('CLEAN', 'Removendo dist/ anterior...');
rmDir(DIST);

// ── Step 2: Compile TypeScript ───────────────────────────────────

log('TSC', 'Compilando TypeScript...');
try {
  execSync('npx tsc', { stdio: 'inherit', cwd: ROOT });
  console.log('  TypeScript compilado com sucesso.');
} catch (err) {
  console.error('  ERRO: Falha ao compilar TypeScript.');
  process.exit(1);
}

// ── Step 3: Copy static assets ───────────────────────────────────

log('COPY', 'Copiando arquivos estáticos para dist/...');

let copiedCount = 0;
const missingAssets = [];

for (const asset of STATIC_ASSETS) {
  const srcPath = findAsset(asset);
  const destPath = path.join(DIST, asset);

  if (srcPath) {
    copyEntry(srcPath, destPath);
    console.log(`  OK: ${asset} (de ${path.relative(ROOT, srcPath)})`);
    copiedCount++;
  } else {
    missingAssets.push(asset);
    console.log(`  AVISO: ${asset} não encontrado (nem em static/ nem na raiz)`);
  }
}

// index.html é obrigatório
if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('\n  ERRO: index.html não encontrado!');
  console.error('  Coloque index.html na pasta static/ OU na raiz do projeto.');
  process.exit(1);
}

console.log(`\n  ${copiedCount} de ${STATIC_ASSETS.length} assets copiados.`);

// ── Done ─────────────────────────────────────────────────────────

log('DONE', 'Build completo!');
console.log(`  Output: ${DIST}`);
console.log(`  Arquivos:`);

function listFiles(dir, prefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      console.log(`  ${prefix}${entry.name}/`);
      listFiles(fullPath, prefix + '  ');
    } else {
      const size = fs.statSync(fullPath).size;
      console.log(`  ${prefix}${entry.name} (${(size / 1024).toFixed(1)} KB)`);
    }
  }
}

listFiles(DIST);
