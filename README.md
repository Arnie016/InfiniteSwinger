# Infinite Swinger

Infinite Swinger is a browser game about building momentum through a jungle-to-volcano campaign map. You jump, latch onto branches, swing through hazards, collect coins, upgrade your rope and survival kit, and push deeper into the route atlas.

This repo contains the current polished web version: premium atlas-style menu, draggable campaign map, local progression, rope/loadout upgrades, rope types, story flow, and a fully client-side deployment path.

## Features

- Full-screen draggable campaign atlas with level focus and launch flow
- Physics-based swinging with braking, drive, rope shaping, and jump charges
- Local progression with levels, upgrades, skins, rope types, and save persistence
- Story/map/menu flow built for browser and PWA play
- Shop, settings, and swing-lab tuning surfaces
- Static deploy target for Vercel or any Vite-compatible host

## Controls

- `E` or hold mouse: latch to a branch / rope
- Release `E` or mouse: launch from the swing
- `Space`: jump with up to 3 charges
- `D`: drive the swing forward
- `A`: brake the swing without killing momentum
- `W`: lift / shorten rope
- `S`: drop / extend rope
- Double click while swinging: reel rope out

## Run Locally

Requirements:

- Node.js 20+
- npm

Install and start:

```bash
npm install
npm run dev
```

Type-check:

```bash
npm run check
```

Build production assets:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Project Structure

```text
App.tsx                 Main game loop, atlas rendering, input, state
components/             UI surfaces: landing, menu, shop, settings, modals
content/                Levels, routes, hazards, story, themes, shop data
engine/                 Cosmetics, config, assets, player profile, swing lab
services/               Persistence and audio helpers
public/                 Audio, favicon, monkey sprite sheet
styles.css              Shared atlas UI styling and typography
```

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Howler
- localForage
- `vite-plugin-pwa`

## Save / Progress

The game is guest-first and local-first:

- saves are stored in the browser
- no account is required
- settings include export / import support for backups

## Deployment

This is a static Vite app. It can be deployed directly to:

- Vercel
- Netlify
- Cloudflare Pages
- any static host that serves the built `dist/` directory

`vercel.json` is included for Vercel deployment.

## Notes

- This repo intentionally ignores local scratch artifacts like `output/`, `dist/`, and large experimental external SDK folders.
- The deployed/public version should only contain the game source, assets, and configuration needed to run the app.
