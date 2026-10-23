# Publishing FOUR with villewedenberg.com

**Recommended:** a separate Netlify project served at `four.villewedenberg.com`, linked from a new project card on your existing portfolio. This means you can edit/deploy FOUR without rebuilding your consulting website.

Suggested portfolio card copy:

**FOUR — Play Connect Four**

A minimalist Connect Four game with a twist: three opponents powered by my own neural networks trained entirely through self-play, plus a perfect-play challenge. Play on your phone or desktop, or challenge a friend.

**Try the game →** `https://four.villewedenberg.com`

Use a screenshot of the actual game board (not a fake AI score chart). Keep the portfolio listing short and put the technical background in its case-study text, if needed. Source code for the private trainer should stay separate from the public game and its static build.

Deployment checklist:

1. Keep your current `four-ai` trainer and models folder private, untouched.
2. Export three distinct historical models into this public project.
3. `npm install && npm run build` and verify all four difficulties in desktop Chrome and mobile Safari/Chrome.
4. Create a **new** Netlify site pointed at this public repo or drag the built `dist` folder into Netlify.
5. Add `four.villewedenberg.com` as a custom domain, configure the required DNS record per Netlify's instructions, and verify HTTPS.
6. Add an ordinary link from your portfolio to the game. Do not overwrite the existing Netlify site's configuration.
7. Include attribution in your repository or legal/credits documentation for the MIT-licensed perfect solver and runtime dependencies.

A public release is not yet deployed by this ZIP; publishing and DNS remain actions for the site's owner.
