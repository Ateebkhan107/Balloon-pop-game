import Phaser from 'phaser';

export interface BalloonTheme {
  primary: string;
  secondary: string;
  highlight: string;
  shadow: string;
  stringColor: string;
}

export const BALLOON_COLORS: Record<string, BalloonTheme> = {
  red: {
    primary: '#ef4444',
    secondary: '#dc2626',
    highlight: '#fca5a5',
    shadow: '#991b1b',
    stringColor: '#cbd5e1',
  },
  blue: {
    primary: '#0ea5e9',
    secondary: '#0284c7',
    highlight: '#7dd3fc',
    shadow: '#0369a1',
    stringColor: '#cbd5e1',
  },
  green: {
    primary: '#10b981',
    secondary: '#059669',
    highlight: '#6ee7b7',
    shadow: '#047857',
    stringColor: '#cbd5e1',
  },
  pink: {
    primary: '#ec4899',
    secondary: '#db2777',
    highlight: '#f9a8d4',
    shadow: '#be185d',
    stringColor: '#cbd5e1',
  },
  purple: {
    primary: '#8b5cf6',
    secondary: '#7c3aed',
    highlight: '#c4b5fd',
    shadow: '#6d28d9',
    stringColor: '#cbd5e1',
  },
};

export class AssetGenerator {
  public static generateAllTextures(scene: Phaser.Scene): void {
    // 1. Generate normal balloons
    Object.entries(BALLOON_COLORS).forEach(([colorName, theme]) => {
      this.generateBalloonTexture(scene, `balloon_${colorName}`, theme);
    });

    // 2. Generate Golden Balloon
    this.generateGoldenBalloonTexture(scene);

    // 3. Generate Hazard Balloon
    this.generateHazardBalloonTexture(scene);

    // 4. Generate Particle Textures
    this.generateParticleTextures(scene);

    // 5. Generate UI & Icon Textures
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

    // Radial 3D shading
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

    // Smaller secondary highlight spot
    ctx.beginPath();
    ctx.arc(cx - 10, cy - 34, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();

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

    // Glowing golden string with curling tail
    ctx.beginPath();
    ctx.moveTo(cx, cy + ry + 8);
    ctx.bezierCurveTo(cx - 18, cy + ry + 40, cx + 22, cy + ry + 70, cx, height - 12);
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Balloon Body with metallic gold gradient
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

    // Center star emblem
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

    // Dangerous outer spikes
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

    // Balloon Body (Obsidian / Crimson)
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

    // Hazard skull / warning symbol in center
    ctx.save();
    ctx.beginPath();
    // Warning triangle
    const tw = 28;
    const th = 24;
    ctx.moveTo(cx, cy - th / 2);
    ctx.lineTo(cx + tw / 2, cy + th / 2);
    ctx.lineTo(cx - tw / 2, cy + th / 2);
    ctx.closePath();
    ctx.fillStyle = '#fef08a';
    ctx.fill();

    // Exclamation mark
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
  }

  private static generateUITextures(scene: Phaser.Scene): void {
    // Sound On Icon
    const soundOnCanvas = document.createElement('canvas');
    soundOnCanvas.width = 44;
    soundOnCanvas.height = 44;
    const sOnCtx = soundOnCanvas.getContext('2d')!;
    sOnCtx.fillStyle = '#ffffff';
    // Speaker cone
    sOnCtx.beginPath();
    sOnCtx.moveTo(10, 16);
    sOnCtx.lineTo(16, 16);
    sOnCtx.lineTo(24, 10);
    sOnCtx.lineTo(24, 34);
    sOnCtx.lineTo(16, 28);
    sOnCtx.lineTo(10, 28);
    sOnCtx.closePath();
    sOnCtx.fill();
    // Sound waves
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
    // Strike line
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
  }
}
