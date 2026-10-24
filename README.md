# FOUR — public Connect Four game

A mobile-first, standalone static site. **The original `four-ai` trainer remains completely separate and unchanged.**

## What works

- Local two-player play with complete Connect Four rules, win highlighting, restart and mode switching.
- Fluid falling pieces with gravity-like acceleration, subtle bounce and `prefers-reduced-motion` support.
- Human turns update before the AI computes. AI computes in a Web Worker; restarting cancels stale work.
- Easy / Medium / Hard: three **distinct saved neural networks** trained by your private FOUR / AI self-play application. The exporter never trains, modifies or generates these weights.
- Pro: independent MIT-licensed perfect solver via `connect-four-ai-wasm`, executing off the main UI thread. No fallback to approximations; a failed engine reports an error.

## Public address

Live at **https://villewedenberg.com/four/**, with a compact listing in the portfolio’s More to explore section. The owner chose a path on the existing domain. The source stays in this repository; a validated static build is copied into the portfolio repository’s `four/` directory. Vite’s relative base supports this path without a separate Netlify project or DNS change. See `PORTFOLIO_INTEGRATION.md` for updates.

On 24 October 2026, the locked production build and all four AI levels were verified locally, on Netlify preview and at the public URL. Two-player wins/restart were tested at 1440/768/390/320; AI-first and restart cancellation also passed. The older ZIP verification notes below describe an earlier environment, not the current deployment. `TEST_REPORT.md` records both stages.

## 1. Copy and unzip alongside your existing project

If your private project is `C:\Users\ville\.vscode\Apps\four-ai`, place this public project in `C:\Users\ville\.vscode\Apps\FOUR_public`. **Do not replace the existing `four-ai` directory.**

Your private trainer, CUDA installation and checkpoints stay untouched.

## One-command preparation (Windows)

If your existing training folder is beside this folder, you can also use:

```powershell
powershell -ExecutionPolicy Bypass -File .\prepare_public.ps1
```

This runs only the model exporter and the new website build. It does **not** reinstall PyTorch or recreate `.venv`. The detailed manual steps follow.

## 2. Export the saved models once

Run in a PowerShell window opened inside this **public** project:

```powershell
..\four-ai\.venv\Scripts\python.exe .\tools\export_models.py --list
```

Then:

```powershell
..\four-ai\.venv\Scripts\python.exe .\tools\export_models.py
```

This reads the *earliest available trained* historical model for Easy, a middle historical model for Medium, and `best.pt` for Hard. All three must be distinct. If automatic selection isn't right, pass `--easy path.pt --medium path.pt --hard path.pt` with your chosen historical snapshots. `--source PATH` overrides the default private project location.

The first export might say `No module named onnx`. Install ONLY that small export dependency into the existing environment if needed:

```powershell
..\four-ai\.venv\Scripts\python.exe -m pip install onnx
```

**Do not reinstall torch, PyTorch CUDA, or any training dependencies.** `onnx` is only for one-time conversion; it is not used by website visitors. The private data folder is never modified.

Outputs are three browser ONNX files and `public/models/manifest.json`. The exported model files are intended to be published and are not private training checkpoints.

### Model accuracy and selection

Easy and Medium strength depends on which actual historical checkpoints still exist. The exporter refuses to relabel identical weights as different difficulties. Hard loads the original model with 96 searches, Medium the historical model with 20, Easy the earliest available with direct policy (zero search). This intentionally retains human-like tactical mistakes instead of injecting tactical rules. There are no hardcoded blocks or wins in those three agents.

## 3. Install website-only JavaScript dependencies and test

Install Node.js 20+ if not already installed, then from the *public project* directory run:

```powershell
npm install
npm run dev
```

This creates `node_modules` **only inside FOUR_public**. It doesn't affect Python or your private trainer. Visit the local URL Vite displays. `npm test` runs the pure game-rule tests.

The package-install step also copies ONNX WebAssembly runtime files to `public/vendor/ort/` for same-origin static hosting. The npm package's Rust/WASM perfect solver is bundled by Vite. Both engines work without a Python backend.

## 4. Build and deploy

```powershell
npm run build
npm run preview
```

Deploy the resulting **`dist/` folder**, not the repository root, to your separate Netlify site. In Netlify, the build command is `npm run build` and publish directory is `dist`.

Netlify DNS can map `four.villewedenberg.com` to the site, then link it from your portfolio. No training backend is deployed and no GPU server needs to be online.

## Pro limitations

Pro evaluates each legal successor with the exact Rust/WASM solver, choosing an outcome-optimal move. The solver includes an embedded opening book but some positions may take noticeably longer on weaker phones. **No claim that every move is instantaneous** is made without mobile benchmarks. The game never downgrades silently if exact solving fails. It is deterministic on ties using a center-first order. Its algorithm and book come from an existing project; your Easy–Hard networks are kept independent.

**License:** `connect-four-ai-wasm` / Benjamin Rall is MIT-licensed (repository: https://github.com/benjaminrall/connect-four-ai). Preserve its license attribution when publishing. ONNX Runtime Web is MIT-licensed, Vite is MIT-licensed. Check the installed packages' license files before publishing a branded production release.

## Safety / privacy

- Nothing in this repository can start or alter training.
- The exporter reads private `.pt` files and writes **only inside this public project**.
- Never upload private `four-ai/data` or `.venv` to Netlify or source control.
- `.gitignore` ignores dependency and build output, not the three deliberately public ONNX exports.
- Position analysis and AI decisions are local to each visitor's device; no user accounts or backend analytics required.

## Known verification limitations

The source was built where npm registry access was unavailable, so installing dependencies, bundling and live testing ONNX/WASM inference in Chrome/Safari remain to be verified on a machine with npm access. The original trained weights were not supplied in this conversation: this ZIP includes the exporter, not fabricated `.onnx` weights. The two-player mode and board logic can be tested independently without them. Test Pro correctness and worst-case latency across opening/middle/endgame boards before promoting the public site.
