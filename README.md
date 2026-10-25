# POP RUSH 🎈⚡

**POP RUSH** is a vibrant, fast-paced 2D arcade balloon popping browser game built with **Phaser 3**, **TypeScript**, and **Vite**. 

Designed for instant play on desktop, tablet, and mobile browsers with zero downloads or backend requirements.

---

## 🎮 Game Features (Version 1 - Time Attack)

- **30-Second Time Attack**: Race against the clock to rack up the highest score possible.
- **Dynamic Floating Physics & Spawning**: Balloons rise naturally with sinusoidal swaying, subtle physics, and scale-in bounces within visible screen boundaries.
- **Speed Combo Multiplier**: Pop balloons in quick succession (within 1.4 seconds) to trigger up to a **5x Score Multiplier**.
- **Specialized Balloon Archetypes**:
  - 🎈 **Normal Balloons** (5 vibrant colors): +100 pts $\times$ Combo multiplier.
  - ⭐ **Golden Balloons** (Rare): +300 pts $\times$ Combo multiplier **+ 2 Seconds Time Bonus**!
  - ⚠️ **Hazard Balloons** (Dangerous): Spiked obsidian/crimson balloons that deduct -200 pts, inflict a -3s penalty, and break active combos.
- **Progressive Difficulty Scaling**: Spawn frequency and float velocity accelerate as the countdown ticks down, culminating in high-intensity **Rush Mode** in the final 10 seconds.
- **Juicy Arcade Feedback**:
  - High-res procedural vector balloon sprites with 3D specular shine and trailing strings.
  - Dynamic confetti, star bursts, and smoke particles.
  - Floating score indicators (`+100`, `+300 GOLD! +2s`, `-200 HAZARD!`).
  - Screen shake and dramatic red impact flashes (disabled when Reduced Motion is active).
  - Procedural Web Audio API sound synthesizer (pop with pitch-shifting combos, golden chimes, hazard warning crunch, countdown beeps, tick-tock clock, and fanfare).
- **Persistent Personal Best & Settings**: High score, SFX toggles, volume presets, and reduced-motion preferences persist in `localStorage`.
- **Full Input Support**: Instantaneous mouse clicking, 3-finger mobile multi-touch, and full keyboard navigation.

---

## 🕹️ Controls

| Action | Mouse / Touch | Keyboard |
| :--- | :--- | :--- |
| **Pop Balloon** | Click / Tap | - |
| **Start / Play Again** | Tap Button | `Space` or `Enter` |
| **Pause / Resume** | Tap Pause Icon | `P` or `Escape` |
| **Menu Navigation** | Tap Buttons | `Arrow Up` / `Arrow Down` / `Enter` |
| **How to Play** | Tap Button | `H` |
| **Settings** | Tap Button | `S` |
| **Fullscreen** | Tap Fullscreen Icon | - |

---

## 📂 Project Structure

```
Balloon-pop-game/
├── public/
│   └── assets/              # Static game image assets (game.jpg, game2.jpg.png)
├── src/
│   ├── entities/
│   │   └── Balloon.ts       # Balloon entity, floating motion, sway, and pop animations
│   ├── scenes/
│   │   ├── BootScene.ts     # Preloader, procedural asset compilation, loading screen
│   │   ├── MenuScene.ts     # Polished title screen, high score badge, button navigation
│   │   ├── GameScene.ts     # Time Attack loop, combo meter, spawning, HUD & pause logic
│   │   └── GameOverScene.ts # Results card, stat breakdown, instant retry, high score celebration
│   ├── services/
│   │   ├── AssetGenerator.ts# Procedural vector texture synthesizer (balloons, icons, particles)
│   │   ├── SoundService.ts  # Web Audio API arcade synthesizer (zero external audio dependencies)
│   │   └── StorageService.ts# LocalStorage persistence for high scores & user settings
│   ├── ui/
│   │   ├── FloatingText.ts  # Floating pop-up indicators
│   │   └── GameModals.ts    # How to Play & Settings interactive modals
│   └── main.ts              # Phaser 3 game initialization & responsive viewport scaling
├── .github/workflows/
│   └── static.yml           # GitHub Pages CI/CD pipeline (Node 20 + Vite build + deploy)
├── index.html               # Main HTML entry with mobile viewport optimizations
├── package.json             # Dependencies and build scripts
├── tsconfig.json            # Strict TypeScript configuration
└── vite.config.ts           # Vite configuration with relative base path resolution
```

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+ (tested on Node.js v20)
- npm 9+

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Build for Production
```bash
npm run build
```
Generates optimized, production-ready static assets in `dist/`.

### 4. Preview Production Build
```bash
npm run preview
```

---

## 🌐 GitHub Pages Deployment

The repository includes a GitHub Actions workflow in [`.github/workflows/static.yml`](.github/workflows/static.yml):
1. Runs automatically on push to the `main` branch (or via manual workflow dispatch).
2. Sets up Node.js 20, installs dependencies, and runs `npm run build`.
3. Deploys the generated `dist/` directory directly to GitHub Pages.

To ensure deployment works seamlessly:
- In your GitHub repository settings, navigate to **Settings > Pages**.
- Under **Build and deployment > Source**, select **GitHub Actions**.

---

## 📜 License
MIT License. Free to use, adapt, and build upon.
