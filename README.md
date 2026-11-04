# Spendulum

Spendulum is a free, offline-first quick expense tracker for iPhone Home Screen use.

## Features

- PWA with `display: standalone` and offline caching
- Fast add flow: amount keypad + press-slide-release radial category menu
- 3 tabs: Add, History, Summary
- Local storage with Dexie (`IndexedDB`)
- Export and import backups (`json`), plus `csv` export
- Monthly backup reminder banner

## Stack

- Vite + Preact + TypeScript
- Dexie
- vite-plugin-pwa
- GitHub Pages + GitHub Actions

## Local development

```bash
npm install
npm run dev
```

## Build and preview

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. In GitHub repository settings, enable **Pages** and set source to **GitHub Actions**.
3. Push to `main`; workflow `.github/workflows/deploy.yml` publishes `dist`.
4. App base path is configured as `/spendulum/` in `vite.config.ts`.

## Install on iPhone

1. Open the deployed URL in Safari.
2. Tap **Share** -> **Add to Home Screen**.
3. Launch from Home Screen for best persistence and standalone behavior.

## Quick validation checklist

- Add flow takes about 3 seconds (amount + press-slide-release)
- Keyboard does not appear during normal Add flow
- Releasing on `Other` opens sub-category sheet and focuses input
- History supports month filter + edit/delete
- Summary shows month totals + category bars
- Export/import round-trip keeps data intact

## License

MIT
