# Validation record — 23 October 2026

## Executed here

- JavaScript rule tests: 8/8 passed. This covers win directions, column limits, replay invalidation, board perspective encoding and immutable copies.
- JavaScript syntax checks: `src/main.js` and `src/brain.worker.js` passed Node syntax checks.
- Python exporter syntax check: passed.
- Chromium UI smoke tests: desktop 1440x900 and mobile 390x844; start local two-player game, alternately drop 7 pieces, verify winning message and inspect rendered layout. No browser page errors in this isolated UI test.

## Not executed here

- No user's `.pt` checkpoint or trained model history was available to test the export or actual AI move quality.
- npm registry access was unavailable, so `npm install`, the Vite production bundling step, ONNX runtime Web inference, Rust/WASM solver loading and iOS/Android device checks remain unverified.
- Perfect solver integration relies on the documented third-party API, and still requires real browser end-to-end validation before a public `perfect` claim is made.
- Nothing has been published to the live portfolio or Netlify.

## Data isolation

The exported website contains no private training files and has no API or backend endpoints for training. The exporter takes the private folder as read-only input and writes models in this public package only.
