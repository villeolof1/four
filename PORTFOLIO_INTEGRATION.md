# FOUR on villewedenberg.com

Public game: **https://villewedenberg.com/four/**. The owner chose same-domain hosting. The consulting homepage lists FOUR as a compact More to explore item, retaining the client work above it. FOUR is available on desktop and mobile.

Source and models remain in `villeolof1/four`. Netlify serves a static build snapshot from the `four/` directory of `villeolof1/ville-wedenberg-site`; changes in this source repository do not automatically republish that snapshot.

## Updating the deployed game

1. Keep the private `four-ai` trainer, checkpoints and data separate and untouched.
2. Use the public lockfile: `npm ci`, `npm test`, `npm run build`.
3. Serve the build at `/four/` during QA. Verify all four AI levels, local two-player win/restart, AI-first and cancellation. Check desktop and mobile including 320px.
4. In an isolated portfolio feature branch, copy the public `dist` contents into `four/`. Retain models, emitted assets, favicon, credits and license notices. The default ONNX runtime needs `vendor/ort/ort-wasm-simd-threaded.mjs` and `.wasm`; unused asyncify/jsep/jspi variants are omitted from the current portfolio build.
5. Review/push/PR the portfolio snapshot, pass its Netlify preview checks, merge normally, then verify the actual public URL and model/WASM loading. Preserve all other portfolio content and settings.

The initial hosted build corresponded to source head `4cfb98134226ef5cd7942d467a907c0655366bfb` (merged by source PR #1). The portfolio release notes record the source SHA for each later snapshot. Source documentation-only updates do not require rebuilding that snapshot. Normalize generated HTML to LF when importing a Windows build; keep the emitted asset names and runtime bytes intact.

## Board depth refinement — 24 October 2026

The front face now sits above falling discs, with holes aligned to the actual slot geometry through a ResizeObserver. Transparent hit targets remain above it. Game rules, models and worker logic are unchanged.

Local browser checks cover actual mid-drop pixel occlusion between holes and visibility through a hole, all-column geometry at 1440/768/390/320 widths, winning highlights/restart, reduced-motion keyboard play, all four AI opponents, AI-first, cancellation and phone touch play. The eight rule tests and production build pass. The portfolio's `.github/qa/project-games.cjs` retains those browser checks. Preview and actual live verification belong to the batched website release.

Pro uses Benjamin Rall’s independent MIT solver; Easy/Medium/Hard use the released self-trained neural networks. Credits distinguish them. Do not publish private training files or claim measured AI strength that has not been evaluated.
