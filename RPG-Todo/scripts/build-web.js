#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const webDir = path.join(__dirname, '..', 'www');
const required = ['index.html', 'app.js', 'style.css', 'manifest.json', 'sw.js'];

if (!fs.existsSync(webDir)) {
  console.error(`[build-web] Missing web directory: ${webDir}`);
  process.exit(1);
}

const missing = required.filter((file) => !fs.existsSync(path.join(webDir, file)));
if (missing.length) {
  console.error(`[build-web] Missing required web assets in www/: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('[build-web] RPG Todo static web bundle is ready in ./www.');
console.log('[build-web] No transpilation needed - Vercel serves ./www directly.');
