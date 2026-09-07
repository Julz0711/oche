// scripts/generate-pwa-icons.js
// One-off script: renders the on-brand mark via next/og's ImageResponse (a Satori-based
// JSX-to-PNG renderer that ships with Next.js — no extra dependency needed) at each required
// icon size, and writes the resulting PNGs directly into the repo.
// Run with: node scripts/generate-pwa-icons.js

const { ImageResponse } = require('next/og');
const React = require('react');
const fs = require('fs');
const path = require('path');

const OCHE = '#141A18';
const WIRE = '#C0A15C';

// A flight-shaped diamond with one vertex chamfered into a small notch — the same two motifs
// this whole visual-identity redesign is built from: the Pips atom's rotated-diamond dart
// flights, and Panel's cut-corner surface language. A dark centre "bullseye" dot gives it a
// focal point. Deliberately NOT the generic dartboard-bullseye every other darts app icon uses.
//
// `padding` insets the whole design from the canvas edge — used for the maskable variant, which
// the OS crops to a circle/rounded square, so content must stay within the inner ~80% "safe
// zone" (a 10% padding on each side).
function mark(size, padding, background) {
  const inner = size - padding * 2;
  const diamond = inner * 0.72;
  const dot = inner * 0.16;

  return React.createElement(
    'div',
    {
      style: {
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: background ?? 'transparent',
      },
    },
    React.createElement(
      'div',
      { style: { position: 'relative', width: diamond, height: diamond, display: 'flex' } },
      React.createElement('div', {
        style: {
          width: diamond,
          height: diamond,
          background: WIRE,
          // A diamond (rotated square) with its right vertex chamfered into a flat notch —
          // built as a single polygon rather than clip-path + CSS rotate(), which Satori
          // renders inconsistently (a rotated element's clip-path came out symmetric on every
          // corner instead of just the one specified, when tested against this exact renderer).
          clipPath: 'polygon(50% 0%, 88% 42%, 88% 58%, 50% 100%, 0% 50%)',
          display: 'flex',
        },
      }),
      React.createElement('div', {
        style: {
          position: 'absolute',
          top: (diamond - dot) / 2,
          left: (diamond - dot) / 2,
          width: dot,
          height: dot,
          borderRadius: '50%',
          background: OCHE,
          display: 'flex',
        },
      })
    )
  );
}

async function renderIcon(size, padding, background, outPath) {
  const res = new ImageResponse(mark(size, padding, background), { width: size, height: size });
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  console.log(`wrote ${outPath} (${buf.length} bytes)`);
}

async function main() {
  // PWA home-screen icons and the Apple touch icon keep a solid background — both platforms
  // fill transparent areas themselves (often with an ugly opaque black), so an intentional
  // opaque background looks correct and consistent instead of leaving it to chance.
  await renderIcon(192, 0, OCHE, path.join(__dirname, '..', 'public', 'icon-192.png'));
  await renderIcon(512, 0, OCHE, path.join(__dirname, '..', 'public', 'icon-512.png'));
  await renderIcon(
    512,
    Math.round(512 * 0.1),
    OCHE,
    path.join(__dirname, '..', 'public', 'icon-maskable-512.png')
  );
  await renderIcon(180, 0, OCHE, path.join(__dirname, '..', 'app', 'apple-icon.png'));

  // The browser-tab favicon, by contrast, gets a real transparent background — it sits on
  // whatever the browser's own tab-bar color is (light or dark), and a floating mark reads far
  // better there than a filled square.
  await renderIcon(192, 0, null, path.join(__dirname, '..', 'app', 'icon.png'));

  // iOS splash screens (launch images) — the OS displays these while the app loads. Sized to
  // match the device's screen dimensions and safe area. Using the same mark design centered
  // on the solid background color for consistency.
  await renderIcon(2048, 512, OCHE, path.join(__dirname, '..', 'public', 'apple-splash-2048-2732.png'));
  await renderIcon(1668, 417, OCHE, path.join(__dirname, '..', 'public', 'apple-splash-1668-2388.png'));
  await renderIcon(1536, 384, OCHE, path.join(__dirname, '..', 'public', 'apple-splash-1536-2048.png'));
  await renderIcon(1125, 281, OCHE, path.join(__dirname, '..', 'public', 'apple-splash-1125-2436.png'));
  await renderIcon(1170, 292, OCHE, path.join(__dirname, '..', 'public', 'apple-splash-1170-2532.png'));
  await renderIcon(1284, 321, OCHE, path.join(__dirname, '..', 'public', 'apple-splash-1284-2778.png'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
