import {
  Sprite,
  Graphics,
} from 'pixi.js';


export function drawHoverCursor(width: number, height: number): Sprite {
  const g = new Graphics(true);
  g.lineColor = 0xFFFFFF;
  g.lineWidth = 1;
  const thirdWidth = width / 3;
  const thirdHeight = height / 3;
  // top left corner
  g.moveTo(0, thirdHeight);
  g.lineTo(0, 0);
  g.lineTo(thirdWidth, 0);

  // top right
  g.moveTo(width - thirdWidth, 0);
  g.lineTo(width, 0);
  g.lineTo(width, thirdHeight);

  // bottom right
  g.moveTo(width, height - thirdHeight);
  g.lineTo(width, height);
  g.lineTo(width - thirdWidth, height);

  // bottom left
  g.moveTo(thirdWidth, height);
  g.lineTo(0, height);
  g.lineTo(0, height - thirdHeight);

  return new Sprite(g.generateCanvasTexture());
}

export function drawSelectCursor(width: number, height: number): Sprite {
  const g = new Graphics(true);
  g.lineColor = 0xFFFFFF;
  g.lineWidth = 1;
  g.moveTo(0, 0);
  g.lineTo(0, height - 1);
  g.lineTo(width - 1, height - 1)
  g.lineTo(width - 1, 0);
  g.lineTo(0, 0);
  return new Sprite(g.generateCanvasTexture());
}
