# FOUR on villewedenberg.com

Public game: **https://villewedenberg.com/four/**. The owner chose same-domain hosting. The consulting homepage lists FOUR as a compact More to explore item, retaining the client work above it. FOUR is available on desktop and mobile.

Source and models remain in `villeolof1/four`. Netlify serves a static build snapshot from the `four/` directory of `villeolof1/ville-wedenberg-site`; changes in this source repository do not automatically republish that snapshot.

## Updating the deployed game

1. Keep the private `four-ai` trainer, checkpoints and data separate and untouched.
2. Use the public lockfile: `npm ci`, `npm test`, `npm run build`.
3. Serve the build at `/four/` during QA. Verify all four AI levels, local two-player win/restart, AI-first and cancellation. Check desktop and mobile including 320px.
4. In an isolated portfolio feature branch, copy the public `dist` contents into `four/`. Retain models, emitted assets, favicon, credits and license notices. The default ONNX runtime needs `vendor/ort/ort-wasm-simd-threaded.mjs` and `.wasm`; unused asyncify/jsep/jspi variants are omitted from the current portfolio build.
5. Review/push/PR the portfolio snapshot, pass its Netlify preview checks, merge normally, then verify the actual public URL and model/WASM loading. Preserve all other portfolio content and settings.

The current build corresponds to source head `4cfb98134226ef5cd7942d467a907c0655366bfb` (merged by source PR #1). Source documentation-only updates do not require rebuilding that snapshot.

Pro uses Benjamin Rall’s independent MIT solver; Easy/Medium/Hard use the released self-trained neural networks. Credits distinguish them. Do not publish private training files or claim measured AI strength that has not been evaluated.
