// scripts/generate-pwa-icons.js
// One-off script: renders the on-brand dartboard/target icon via next/og's ImageResponse (a
// Satori-based JSX-to-PNG renderer that ships with Next.js — no extra dependency needed) at each
// required PWA icon size, and writes the resulting PNGs directly into the repo.
// Run with: node scripts/generate-pwa-icons.js

const { ImageResponse } = require('next/og');
const React = require('react');
const fs = require('fs');
const path = require('path');

const OCHE = '#141A18';
const WIRE = '#C0A15C';
const CHALK = '#F2F4F3';

/** Bold, minimal target motif — three tones (gold ring / dark gap / solid gold centre), each
 *  band thick enough to stay legible at a 16px browser-tab favicon. The earlier version nested
 *  four thin alternating rings, which read fine at 512px but turned to illegible mush at
 *  favicon size, since bands under ~2px alias away entirely. `padding` insets the whole design
 *  from the canvas edge — used for the maskable variant, which the OS crops to a circle/rounded
 *  square, so content must stay within the inner ~80% "safe zone" (a 10% padding on each side). */
function targetIcon(size, padding) {
  const inner = size - padding * 2;
  const ring = (scale, color, child) =>
    React.createElement(
      'div',
      {
        style: {
          width: inner * scale,
          height: inner * scale,
          borderRadius: '50%',
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
      child
    );

  return React.createElement(
    'div',
    {
      style: {
        width: size,
        height: size,
        background: OCHE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    },
    ring(1, WIRE, ring(0.55, OCHE, ring(0.22, WIRE)))
  );
}

async function renderIcon(size, padding, outPath) {
  const res = new ImageResponse(targetIcon(size, padding), { width: size, height: size });
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  console.log(`wrote ${outPath} (${buf.length} bytes)`);
}

async function main() {
  await renderIcon(192, 0, path.join(__dirname, '..', 'public', 'icon-192.png'));
  await renderIcon(512, 0, path.join(__dirname, '..', 'public', 'icon-512.png'));
  await renderIcon(512, Math.round(512 * 0.1), path.join(__dirname, '..', 'public', 'icon-maskable-512.png'));
  await renderIcon(180, 0, path.join(__dirname, '..', 'app', 'apple-icon.png'));
  // app/icon.png reuses the same 192px render as public/icon-192.png — Next.js's file-based
  // `icon` convention picks this up for the browser-tab icon, replacing the stock favicon.ico.
  fs.copyFileSync(
    path.join(__dirname, '..', 'public', 'icon-192.png'),
    path.join(__dirname, '..', 'app', 'icon.png')
  );
  console.log('wrote app/icon.png (copied from public/icon-192.png)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
