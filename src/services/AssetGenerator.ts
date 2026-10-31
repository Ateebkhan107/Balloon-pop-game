import Phaser from 'phaser';

export interface BalloonTheme {
  name: string;
  label: string;
  symbol: string;
  primary: string;
  secondary: string;
  highlight: string;
  shadow: string;
  stringColor: string;
  hexNum: number;
}

export const BALLOON_COLORS: Record<string, BalloonTheme> = {
  red: {
    name: 'red',
    label: 'RED',
    symbol: '●',
    primary: '#ef4444',
    secondary: '#dc2626',
    highlight: '#fca5a5',
    shadow: '#991b1b',
    stringColor: '#cbd5e1',
    hexNum: 0xef4444,
  },
  blue: {
    name: 'blue',
    label: 'BLUE',
    symbol: '◆',
    primary: '#0ea5e9',
    secondary: '#0284c7',
    highlight: '#7dd3fc',
    shadow: '#0369a1',
    stringColor: '#cbd5e1',
    hexNum: 0x0ea5e9,
  },
  green: {
    name: 'green',
    label: 'GREEN',
    symbol: '■',
    primary: '#10b981',
    secondary: '#059669',
    highlight: '#6ee7b7',
    shadow: '#047857',
    stringColor: '#cbd5e1',
    hexNum: 0x10b981,
  },
  yellow: {
    name: 'yellow',
    label: 'YELLOW',
    symbol: '★',
    primary: '#f59e0b',
    secondary: '#d97706',
    highlight: '#fde68a',
    shadow: '#92400e',
    stringColor: '#cbd5e1',
    hexNum: 0xf59e0b,
  },
  purple: {
    name: 'purple',
    label: 'PURPLE',
    symbol: '♥',
    primary: '#a855f7',
    secondary: '#9333ea',
    highlight: '#e9d5ff',
    shadow: '#6b21a8',
    stringColor: '#cbd5e1',
    hexNum: 0xa855f7,
  },
};

export class AssetGenerator {
  public static generateAllTextures(scene: Phaser.Scene): void {
    if (scene.textures.exists('balloon_red')) return;

    // 1. Generate normal colored balloons
    Object.entries(BALLOON_COLORS).forEach(([colorKey, theme]) => {
      this.generateBalloonTexture(scene, `balloon_${colorKey}`, theme);
    });

    // 2. Generate Golden Balloon
    this.generateGoldenBalloonTexture(scene);

    // 3. Generate Hazard / Bomb Balloon
    this.generateHazardBalloonTexture(scene);

    // 4. Generate Rainbow Special Balloon
    this.generateRainbowBalloonTexture(scene);

    // 5. Generate Freeze Special Balloon
    this.generateFreezeBalloonTexture(scene);

    // 6. Generate Particle Textures
    this.generateParticleTextures(scene);

    // 7. Generate UI & Icon Textures (Sound, Pause, Hearts)
    this.generateUITextures(scene);
  }

  private static generateBalloonTexture(
    scene: Phaser.Scene,
    textureKey: string,
    theme: BalloonTheme
  ): void {
    const width = 120;
    const height = 170;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const cx = width / 2;
    const cy = 60;
    const rx = 44;
    const ry = 55;

    // Draw string
    ctx.beginPath();
    ctx.moveTo(cx, cy + ry + 8);
    ctx.bezierCurveTo(cx - 14, cy + ry + 35, cx + 18, cy + ry + 65, cx - 4, height - 10);
    ctx.strokeStyle = theme.stringColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw Balloon Body (Egg-shaped balloon)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);

    const grad = ctx.createRadialGradient(cx - 15, cy - 18, 5, cx, cy, rx);
    grad.addColorStop(0, theme.highlight);
    grad.addColorStop(0.35, theme.primary);
    grad.addColorStop(0.85, theme.secondary);
    grad.addColorStop(1, theme.shadow);
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 6;
    ctx.fill();
    ctx.restore();

    // Specular shine / highlight reflection
    ctx.beginPath();
    ctx.ellipse(cx - 16, cy - 20, 12, 18, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fill();

    // Secondary small highlight
    ctx.beginPath();
    ctx.arc(cx - 10, cy - 34, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();

    // Accessibility Symbol in center (subtle, readable)
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(theme.symbol, cx + 10, cy + 12);
    ctx.restore();

    // Bottom tie knot
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + ry + 7);
    ctx.lineTo(cx + 8, cy + ry + 7);
    ctx.lineTo(cx + 1, cy + ry - 1);
    ctx.closePath();
    ctx.fillStyle = theme.secondary;
    ctx.fill();

    scene.textures.addCanvas(textureKey, canvas);
  }

  private static generateGoldenBalloonTexture(scene: Phaser.Scene): void {
    const width = 130;
    const height = 180;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const cx = width / 2;
    const cy = 65;
    const rx = 48;
    const ry = 60;

    // Glowing golden string
    ctx.beginPath();
    ctx.moveTo(cx, cy + ry + 8);
    ctx.bezierCurveTo(cx - 18, cy + ry + 40, cx + 22, cy + ry + 70, cx, height - 12);
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Metallic gold body
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);

    const grad = ctx.createRadialGradient(cx - 18, cy - 22, 6, cx, cy, rx);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, '#fef08a');
    grad.addColorStop(0.65, '#eab308');
    grad.addColorStop(0.9, '#ca8a04');
    grad.addColorStop(1, '#854d0e');

    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(234, 179, 8, 0.6)';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.restore();

    // Specular highlight
    ctx.beginPath();
    ctx.ellipse(cx - 18, cy - 24, 14, 20, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fill();

    // Star emblem
    this.drawStar(ctx, cx, cy, 5, 16, 7, '#ffffff', '#ca8a04');

    // Tie knot
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + ry + 8);
    ctx.lineTo(cx + 10, cy + ry + 8);
    ctx.lineTo(cx + 1, cy + ry - 1);
    ctx.closePath();
    ctx.fillStyle = '#ca8a04';
    ctx.fill();

    scene.textures.addCanvas('balloon_golden', canvas);
  }

  private static generateHazardBalloonTexture(scene: Phaser.Scene): void {
    const width = 130;
    const height = 180;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const cx = width / 2;
    const cy = 65;
    const rx = 46;
    const ry = 58;

    // Dark jagged string
    ctx.beginPath();
    ctx.moveTo(cx, cy + ry + 8);
    ctx.lineTo(cx - 10, cy + ry + 35);
    ctx.lineTo(cx + 12, cy + ry + 65);
    ctx.lineTo(cx - 4, height - 12);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Spikes
    ctx.save();
    ctx.fillStyle = '#b91c1c';
    const spikeAngles = [-Math.PI * 0.75, -Math.PI * 0.5, -Math.PI * 0.25, Math.PI * 0.25, Math.PI * 0.75];
    spikeAngles.forEach((angle) => {
      const sx = cx + Math.cos(angle) * (rx + 2);
      const sy = cy + Math.sin(angle) * (ry + 2);
      const tipX = cx + Math.cos(angle) * (rx + 16);
      const tipY = cy + Math.sin(angle) * (ry + 16);
      ctx.beginPath();
      ctx.moveTo(sx - Math.sin(angle) * 8, sy + Math.cos(angle) * 8);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(sx + Math.sin(angle) * 8, sy - Math.cos(angle) * 8);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();

    // Obsidian/Crimson body
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);

    const grad = ctx.createRadialGradient(cx - 15, cy - 20, 6, cx, cy, rx);
    grad.addColorStop(0, '#f87171');
    grad.addColorStop(0.3, '#dc2626');
    grad.addColorStop(0.75, '#1e1b4b');
    grad.addColorStop(1, '#09090b');

    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(239, 68, 68, 0.7)';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.restore();

    // Hazard symbol
    ctx.save();
    ctx.beginPath();
    const tw = 28;
    const th = 24;
    ctx.moveTo(cx, cy - th / 2);
    ctx.lineTo(cx + tw / 2, cy + th / 2);
    ctx.lineTo(cx - tw / 2, cy + th / 2);
    ctx.closePath();
    ctx.fillStyle = '#fef08a';
    ctx.fill();

    ctx.beginPath();
    ctx.rect(cx - 2.5, cy - 6, 5, 8);
    ctx.arc(cx, cy + 7, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.restore();

    // Tie knot
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy + ry + 8);
    ctx.lineTo(cx + 9, cy + ry + 8);
    ctx.lineTo(cx, cy + ry - 1);
    ctx.closePath();
    ctx.fillStyle = '#991b1b';
    ctx.fill();

    scene.textures.addCanvas('balloon_hazard', canvas);
  }

  private static generateRainbowBalloonTexture(scene: Phaser.Scene): void {
    const width = 130;
    const height = 180;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const cx = width / 2;
    const cy = 65;
    const rx = 48;
    const ry = 60;

    // Golden wavy string
    ctx.beginPath();
    ctx.moveTo(cx, cy + ry + 8);
    ctx.bezierCurveTo(cx - 16, cy + ry + 35, cx + 20, cy + ry + 65, cx, height - 12);
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Iridescent Rainbow Body
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);

    const grad = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
    grad.addColorStop(0, '#f43f5e'); // Red-Pink
    grad.addColorStop(0.25, '#fb923c'); // Orange
    grad.addColorStop(0.5, '#facc15'); // Yellow
    grad.addColorStop(0.75, '#4ade80'); // Green
    grad.addColorStop(1, '#38bdf8'); // Cyan-Blue

    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.restore();

    // Specular shine
    ctx.beginPath();
    ctx.ellipse(cx - 18, cy - 24, 14, 20, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();

    // Central Rainbow Emblem (Rainbow Icon or Sparkle)
    ctx.save();
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🌈', cx, cy + 4);
    ctx.restore();

    // Tie knot
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy + ry + 8);
    ctx.lineTo(cx + 9, cy + ry + 8);
    ctx.lineTo(cx, cy + ry - 1);
    ctx.closePath();
    ctx.fillStyle = '#fb923c';
    ctx.fill();

    scene.textures.addCanvas('balloon_rainbow', canvas);
  }

  private static generateFreezeBalloonTexture(scene: Phaser.Scene): void {
    const width = 130;
    const height = 180;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const cx = width / 2;
    const cy = 65;
    const rx = 48;
    const ry = 60;

    // Ice-blue crystalline string
    ctx.beginPath();
    ctx.moveTo(cx, cy + ry + 8);
    ctx.bezierCurveTo(cx - 14, cy + ry + 35, cx + 18, cy + ry + 65, cx - 2, height - 12);
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Glacial Ice Body
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);

    const grad = ctx.createRadialGradient(cx - 15, cy - 20, 6, cx, cy, rx);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#7dd3fc');
    grad.addColorStop(0.7, '#0284c7');
    grad.addColorStop(1, '#075985');

    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.7)';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.restore();

    // Specular shine
    ctx.beginPath();
    ctx.ellipse(cx - 18, cy - 24, 14, 20, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();

    // Snowflake Emblem in center
    ctx.save();
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('❄️', cx, cy + 4);
    ctx.restore();

    // Tie knot
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy + ry + 8);
    ctx.lineTo(cx + 9, cy + ry + 8);
    ctx.lineTo(cx, cy + ry - 1);
    ctx.closePath();
    ctx.fillStyle = '#0284c7';
    ctx.fill();

    scene.textures.addCanvas('balloon_freeze', canvas);
  }

  private static drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number,
    fillColor: string,
    strokeColor?: string
  ): void {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private static generateParticleTextures(scene: Phaser.Scene): void {
    // 1. Sparkle circle
    const c1 = document.createElement('canvas');
    c1.width = 16;
    c1.height = 16;
    const ctx1 = c1.getContext('2d')!;
    const g1 = ctx1.createRadialGradient(8, 8, 1, 8, 8, 8);
    g1.addColorStop(0, '#ffffff');
    g1.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
    g1.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx1.fillStyle = g1;
    ctx1.fillRect(0, 0, 16, 16);
    scene.textures.addCanvas('particle_sparkle', c1);

    // 2. Confetti Star
    const c2 = document.createElement('canvas');
    c2.width = 24;
    c2.height = 24;
    const ctx2 = c2.getContext('2d')!;
    this.drawStar(ctx2, 12, 12, 5, 11, 5, '#fef08a');
    scene.textures.addCanvas('particle_star', c2);

    // 3. Confetti Rectangle
    const c3 = document.createElement('canvas');
    c3.width = 14;
    c3.height = 10;
    const ctx3 = c3.getContext('2d')!;
    ctx3.fillStyle = '#ffffff';
    ctx3.fillRect(0, 0, 14, 10);
    scene.textures.addCanvas('particle_confetti', c3);

    // 4. Soft Smoke / Cloud puff
    const c4 = document.createElement('canvas');
    c4.width = 32;
    c4.height = 32;
    const ctx4 = c4.getContext('2d')!;
    const g4 = ctx4.createRadialGradient(16, 16, 2, 16, 16, 15);
    g4.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    g4.addColorStop(0.6, 'rgba(255, 255, 255, 0.4)');
    g4.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx4.fillStyle = g4;
    ctx4.fillRect(0, 0, 32, 32);
    scene.textures.addCanvas('particle_smoke', c4);

    // 5. Snowflake Particle for freeze effect
    const c5 = document.createElement('canvas');
    c5.width = 20;
    c5.height = 20;
    const ctx5 = c5.getContext('2d')!;
    ctx5.fillStyle = '#bae6fd';
    ctx5.font = '14px sans-serif';
    ctx5.textAlign = 'center';
    ctx5.textBaseline = 'middle';
    ctx5.fillText('❄', 10, 10);
    scene.textures.addCanvas('particle_snowflake', c5);
  }

  private static generateUITextures(scene: Phaser.Scene): void {
    // Sound On Icon
    const soundOnCanvas = document.createElement('canvas');
    soundOnCanvas.width = 44;
    soundOnCanvas.height = 44;
    const sOnCtx = soundOnCanvas.getContext('2d')!;
    sOnCtx.fillStyle = '#ffffff';
    sOnCtx.beginPath();
    sOnCtx.moveTo(10, 16);
    sOnCtx.lineTo(16, 16);
    sOnCtx.lineTo(24, 10);
    sOnCtx.lineTo(24, 34);
    sOnCtx.lineTo(16, 28);
    sOnCtx.lineTo(10, 28);
    sOnCtx.closePath();
    sOnCtx.fill();
    sOnCtx.strokeStyle = '#ffffff';
    sOnCtx.lineWidth = 3;
    sOnCtx.beginPath();
    sOnCtx.arc(24, 22, 8, -Math.PI / 3, Math.PI / 3);
    sOnCtx.stroke();
    sOnCtx.beginPath();
    sOnCtx.arc(24, 22, 14, -Math.PI / 3, Math.PI / 3);
    sOnCtx.stroke();
    scene.textures.addCanvas('icon_sound_on', soundOnCanvas);

    // Sound Off Icon
    const soundOffCanvas = document.createElement('canvas');
    soundOffCanvas.width = 44;
    soundOffCanvas.height = 44;
    const sOffCtx = soundOffCanvas.getContext('2d')!;
    sOffCtx.drawImage(soundOnCanvas, 0, 0);
    sOffCtx.strokeStyle = '#ef4444';
    sOffCtx.lineWidth = 4;
    sOffCtx.beginPath();
    sOffCtx.moveTo(8, 8);
    sOffCtx.lineTo(36, 36);
    sOffCtx.stroke();
    scene.textures.addCanvas('icon_sound_off', soundOffCanvas);

    // Pause Icon
    const pauseCanvas = document.createElement('canvas');
    pauseCanvas.width = 44;
    pauseCanvas.height = 44;
    const pCtx = pauseCanvas.getContext('2d')!;
    pCtx.fillStyle = '#ffffff';
    pCtx.fillRect(12, 10, 6, 24);
    pCtx.fillRect(26, 10, 6, 24);
    scene.textures.addCanvas('icon_pause', pauseCanvas);

    // Heart Full Icon (Endless Lives)
    const heartFullCanvas = document.createElement('canvas');
    heartFullCanvas.width = 36;
    heartFullCanvas.height = 36;
    const hfCtx = heartFullCanvas.getContext('2d')!;
    hfCtx.fillStyle = '#ef4444';
    hfCtx.font = '26px sans-serif';
    hfCtx.textAlign = 'center';
    hfCtx.textBaseline = 'middle';
    hfCtx.fillText('❤️', 18, 18);
    scene.textures.addCanvas('icon_heart_full', heartFullCanvas);

    // Heart Empty Icon (Lost Life)
    const heartEmptyCanvas = document.createElement('canvas');
    heartEmptyCanvas.width = 36;
    heartEmptyCanvas.height = 36;
    const heCtx = heartEmptyCanvas.getContext('2d')!;
    heCtx.fillStyle = '#64748b';
    heCtx.font = '26px sans-serif';
    heCtx.textAlign = 'center';
    heCtx.textBaseline = 'middle';
    heCtx.fillText('🖤', 18, 18);
    scene.textures.addCanvas('icon_heart_empty', heartEmptyCanvas);
  }
}
