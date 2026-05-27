/**
 * build.js — Script de build para Horivoo
 *
 * 1. Compila TypeScript (src/*.ts → dist/js/*.js)
 * 2. Copia arquivos estáticos (static/* → dist/*)
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
const staticEntries = fs.readdirSync(STATIC, { withFileTypes: true });
for (const entry of staticEntries) {
  const srcPath = path.join(STATIC, entry.name);
  const destPath = path.join(DIST, entry.name);
  if (entry.isDirectory()) {
    copyDir(srcPath, destPath);
  } else {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
  }
}
console.log('  Arquivos estáticos copiados.');

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
