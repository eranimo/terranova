import {
  Texture,
  Graphics,
} from 'pixi.js';


export function drawHoverCursor(width: number, height: number): Texture {
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

  return g.generateCanvasTexture();
}

export function drawSelectCursor(width: number, height: number): Texture {
  const g = new Graphics(true);
  g.lineColor = 0xFFFFFF;
  g.lineWidth = 1;
  g.moveTo(0, 0);
  g.lineTo(0, height - 1);
  g.lineTo(width - 1, height - 1)
  g.lineTo(width - 1, 0);
  g.lineTo(0, 0);
  return g.generateCanvasTexture();
}


export function makeArrow(width: number, height: number): Texture {
  const g = new PIXI.Graphics(true);
  g.lineColor = 0x000000;
  g.lineWidth = 1.4;
  g.moveTo(Math.round(width / 2), height);
  g.lineTo(Math.round(width / 2), 0);
  g.lineTo(0, height / 2);
  g.moveTo(Math.round(width / 2), 0);
  g.lineTo(width, Math.round(height / 2));
  return g.generateCanvasTexture();
}
