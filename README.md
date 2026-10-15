# Movya Wallet — landing page

A complete English and Spanish landing page for **Movya Wallet**, the Stellar wallet project built around conversational payments.

**One message. One transaction. / Un mensaje. Una transacción.**

## Experience

- English at `/`, Spanish at `/es/`, with a visible language switch.
- Responsive layout, wallet interface preview and Movya mascot.
- Guided conversation demo: send XLM or USDC, review, confirm, cancel, check example balances or learn how to receive.
- Product features, payment-control section, FAQs and real Instagram/GitHub links.
- Static HTML in both languages, canonical and hreflang tags, sitemap, structured data and localized social-sharing images.
- Accessible controls, keyboard navigation, reduced-motion support and self-hosted fonts.
- No analytics, tracking, wallet connection, form-data collection or production runtime dependencies.

The product and visual direction are based on [Movya-Wallet-Stellar](https://github.com/ManuelElias1999/Movya-Wallet-Stellar), reviewed at commit `979f01c146c2fe4da0398465b0be96080085ee70`. The landing preserves the existing brand palette, local assets, balance-card styling and confirmation-first payment flow. The winking mascot follows the updated social identity.

## Product status and demo boundaries

Movya is in development on **Stellar Testnet**. The current wallet app supports test XLM/USDC transfers. Production onboarding/recovery, swaps and fee sponsorship are not presented as available features.

The landing’s interactive demo is a **local, scripted illustration**, not a live AI service. It does not sign, broadcast or look up transactions and does not request keys, passwords or a wallet connection. Demo balances and payment results are explicitly illustrative. The primary call to action opens this demo; there is no invented app-download or waitlist destination.

## Run and verify

Requires Node.js 22+.

```sh
npm ci
npm run build
npm run check
npm test
```

The production output is `dist/`. Serve that folder with any static hosting service. Opening HTML directly with `file://` will not run ES modules; use HTTP when previewing.

`linkedom` is a development-only dependency used for DOM integration tests. Production is plain HTML, CSS and JavaScript. Tests cover bilingual rendering, language links, payment parsing and amount boundaries, confirmation/cancellation, reset, safe message rendering and mobile-menu behavior. Automated tests do not replace a visual browser review.

## Deploy

### Vercel

Import this repository. The included `vercel.json` sets:

- Build command: `npm run build`
- Output directory: `dist`

### Netlify

Import the repository; `netlify.toml` provides the same build and output settings.

### Other static hosts / GitHub Pages

Upload the contents of `dist/`. Both `/` and `/es/` must serve their `index.html` files.

The canonical domain defaults to `https://movyawallet.com`. Override it at build time if needed:

```sh
SITE_URL=https://www.example.com npm run build
```

For a GitHub Pages project path:

```sh
SITE_URL=https://manuelelias1999.github.io BASE_PATH=/movya_wallet_landing_page npm run build
```

Hosting and domain settings are not changed by this repository.

## Edit

| File                | Purpose                                                   |
| ------------------- | --------------------------------------------------------- |
| `src/content.mjs`   | English and Spanish copy, including demo replies          |
| `src/template.mjs`  | Page structure, metadata and interface illustration       |
| `src/styles.css`    | Brand tokens, responsive layouts and motion settings      |
| `src/app.js`        | Mobile navigation and interactive demo                    |
| `src/demo.js`       | Bilingual, deterministic demo-intent parser               |
| `scripts/build.mjs` | Static output, sitemap, robots and 404 page               |
| `scripts/check.mjs` | Generated content and local-asset checks                  |
| `public/assets/`    | Optimized brand images, localized sharing cards and fonts |

Brand assets come from the Movya project. Manrope is self-hosted under the SIL Open Font License; see `public/assets/Manrope-OFL.txt`.
