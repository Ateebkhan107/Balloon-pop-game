import Phaser from 'phaser';

export class FloatingText {
  public static show(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    color: string = '#ffffff',
    fontSize: string = '28px'
  ): void {
    const label = scene.add.text(x, y, text, {
      fontFamily: "'Fredoka', sans-serif",
      fontSize,
      fontStyle: 'bold',
      color,
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center',
    });
    label.setOrigin(0.5);
    label.setDepth(50);

    // Punch scale up, float up, fade out
    label.setScale(0.5);
    scene.tweens.add({
      targets: label,
      scaleX: 1.2,
      scaleY: 1.2,
      y: y - 55,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: label,
          scaleX: 1,
          scaleY: 1,
          y: y - 90,
          alpha: 0,
          duration: 350,
          ease: 'Power1',
          onComplete: () => {
            label.destroy();
          },
        });
      },
    });
  }
}
