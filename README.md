# POP RUSH 🎈⚡

**POP RUSH** is a vibrant, skill-based 2D arcade balloon popping browser game built with **Phaser 3**, **TypeScript**, and **Vite**.

Designed for instant, high-framerate play on desktop, tablet, and mobile browsers with zero downloads or backend requirements.

---

## 🎯 Core Gameplay: COLOR RUSH

A prominent indicator at the top of the HUD displays the active target color:
`POP RED ●`, `POP BLUE ◆`, `POP GREEN ■`, `POP YELLOW ★`, `POP PURPLE ♥`

- **Matching Target**: Popping the designated color awards points, builds the speed combo multiplier, and charges your **Fever Gauge**.
- **Distractions**: Non-matching balloons are decoys! In Time Attack, wrong-color pops deduct score and break combos. In Endless Rush, wrong-color pops cost 1 Life!
- **Color Transitions**: Target colors change automatically at balanced intervals with distinct warning pulses, sound cues, and an immediate target availability guarantee.
- **Fair Grace Period**: A 600ms transition buffer accepts taps on the previous target color during a switch, preventing unfair accidental penalties.

---

## 🕹️ Two Playable Game Modes

### 1. ⏱️ TIME ATTACK (30s Countdown)
- **Goal**: Score as many points as possible before the 30-second clock expires.
- **Clock Extensions**: Pop **Golden Balloons** to add $+2\text{s}$ back to your timer!
- **Final Rush**: High-intensity challenge in the final 10 seconds with accelerated float speeds and rapid spawns.

### 2. ❤️ ENDLESS RUSH (Infinite Survival)
- **Goal**: Survive as long as you can across progressive difficulty tiers with **3 Lives** (`❤️❤️❤️`).
- **Life Penalties**:
  - Popping a wrong-colored balloon costs 1 Life.
  - Hitting a Bomb costs 1 Life.
  - Allowing a valid target-color balloon to escape past the ceiling costs 1 Life.
  - Non-target balloons escaping do *not* penalize you.
- **Dynamic Escalation**: Survival clock tracks elapsed time; float speed, spawn cadence, and color-switch frequency steadily accelerate.

---

## ✨ Special Balloons & Skill Mechanics

| Balloon | Visual Design | Effect / Rule |
| :--- | :--- | :--- |
| **Normal** | 5 Vibrant Colors (Red, Blue, Green, Yellow, Purple) with Accessibility Symbols | $+100\text{ pts} \times \text{combo}$ when matching target color. Decoy if non-matching. |
| **Golden** | Shimmering Metallic Gold with Star Emblem | Universal bonus target! $+300\text{ pts} \times \text{combo}$ ($+2\text{s}$ in Time Attack). Always safe to pop! |
| **Rainbow** | Iridescent Prism with Golden Knot | Universal WILD! Counts as matching any target color, $+250\text{ pts}$, and grants a major Fever charge boost! |
| **Freeze** | Glacial Cyan Crystal with Snowflake Emblem | Slow-motion burst! Freezes all balloon velocities by 60% for 4 seconds ($+2\text{s}$ timer pause in Time Attack). |
| **Bomb / Hazard** | Obsidian & Crimson Spikes with Warning Triangle | Dangerous! Inflicts $-200\text{ pts}$ & $-3\text{s}$ in Time Attack, or $-1\text{ Life}$ in Endless Rush. |

### 💥 Accuracy-based "Perfect Pop"
- Tapping a balloon near its visual center ($\le 22\text{px}$) triggers a **PERFECT POP!** bonus ($+50\text{ pts} \times \text{combo}$) with an extra Fever meter boost.

### 🔥 5-Second Fever Mode
- Chain correct pops and bullseyes to fill your Fever Gauge to 100%.
- When unleashed, **ALL balloons become valid targets** with an automatic **$2\times$ Score Multiplier** and celebratory golden particles!

---

## 🕹️ Controls Reference

| Action | Touch / Mouse | Keyboard |
| :--- | :--- | :--- |
| **Pop Balloon** | Click / Tap | — |
| **Select Mode / Start** | Tap Mode Card | `Arrow Up` / `Arrow Down` + `Enter` |
| **Play Again / Retry** | Tap Button | `Space` or `Enter` |
| **Pause / Resume** | Tap Pause Button | `P` or `Escape` |
| **How to Play** | Tap Button | `H` |
| **Settings** | Tap Button | `S` |
| **Fullscreen** | Tap Fullscreen Icon | — |

---

## 📂 Project Structure

```
Balloon-pop-game/
├── public/assets/               # Backgrounds & static image assets
├── src/
│   ├── entities/
│   │   └── Balloon.ts           # Balloon entity: normal, golden, rainbow, freeze, hazard
│   ├── scenes/
│   │   ├── BootScene.ts         # Preload & procedural vector asset generation
│   │   ├── MenuScene.ts         # Mode selector (Time Attack & Endless Rush), stats, controls
│   │   ├── GameScene.ts         # Color Rush manager, Fever system, HUD, mode game loops
│   │   └── GameOverScene.ts     # Mode-specific stats, records celebration, instant retry
│   ├── services/
│   │   ├── AssetGenerator.ts    # Procedural canvas vector graphics (balloons, hearts, icons)
│   │   ├── ColorRushManager.ts  # Target color scheduler, transition fairness & grace period
│   │   ├── FeverManager.ts      # Fever charging, 100% trigger, timer & 2x multiplier
│   │   ├── SoundService.ts      # Web Audio procedural sound synthesizer (10+ arcade SFX)
│   │   └── StorageService.ts    # LocalStorage persistence for both game modes & settings
│   ├── ui/
│   │   ├── FloatingText.ts      # Floating indicators (+100, PERFECT! +50, -1 LIFE, FEVER)
│   │   └── GameModals.ts        # How to Play & Settings interactive modals
│   └── main.ts                  # Phaser 3 responsive 720x1080 canvas scaling
├── tests/
│   ├── verify.cjs               # Automated game logic, Color Rush, Fever & Endless test suite
│   └── viewport-scaling.test.cjs# Desktop & mobile responsive scaling and hit-area tests
├── .github/workflows/static.yml # GitHub Pages CI/CD automated deployment
├── index.html                   # HTML entry with 100dvh mobile viewport optimizations
├── package.json                 # Scripts: dev, build, preview, test
├── tsconfig.json                # Strict TypeScript configuration
└── vite.config.ts               # Base relative path resolution
```

---

## 🚀 Local Development

```bash
# Install dependencies
npm install

# Run automated test suites (Logic & Viewport Scaling)
npm test

# Start local development server with hot reload
npm run dev

# Compile production bundle
npm run build
```

---

## 📜 License
MIT License. Free to use, adapt, and build upon.
