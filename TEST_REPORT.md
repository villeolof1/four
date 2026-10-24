# Validation record — 23 October 2026

## Deployment validation — 24 October 2026

The earlier ZIP limitations below are historical. Locked `npm ci`, 8 rule tests and Vite production build now pass. Browser QA was completed under `/four/` locally, on the portfolio Netlify preview and at **https://villewedenberg.com/four/**:

- Easy, Medium, Hard and Pro each loaded their actual engine and returned a legal move.
- Two-player win/highlight/restart passed at 1440/768/390/320.
- AI-first and stale-reply cancellation during restart passed.
- No page errors or failed runtime requests. Actual screenshots inspected; official game action client also used.
- Public model and WASM bytes matched the validated snapshot. Private trainer/checkpoints untouched.

These are Chromium desktop and mobile viewport tests, not physical iOS/Android certification or an independent proof of AI playing strength. The Pro solver’s perfect-play description comes from the upstream solver, not a new claim about the trained models.

## Historical ZIP checks

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
