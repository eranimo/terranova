import ndarray from 'ndarray';
import Alea from 'alea';
import SimplexNoise from 'simplex-noise';
import { IWorldMapGenOptions, EWorldShape } from '../types';


function generateHeightmap(
  options: IWorldMapGenOptions,
  heightmap: ndarray,
  cursor: [number, number, number, number],
) {
  const { seed, size: { width, height }, worldShape, worldShapePower } = options;

  const rng = new (Alea as any)(seed);
  const simplex = new SimplexNoise(rng);
  const noise = (nx, ny) => simplex.noise2D(nx, ny);
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDistanceToCenter = Math.min(width / 2, height / 2);

  const getHeight = (x: number, y: number) => {
    // use simplex noise to create random terrain
    const nx = x / width - 0.5;
    const ny = y / height - 0.5;
    let value = (
      0.35 * noise(2.50 * nx, 2.50 * ny) +
      0.30 * noise(5.00 * nx, 5.00 * ny) +
      0.20 * noise(10.0 * nx, 10.0 * ny) +
      0.10 * noise(20.0 * nx, 20.0 * ny) +
      0.05 * noise(40.0 * nx, 40.0 * ny)
    );
    value = (value + 1) / 2;

    // decrease the height of cells farther away from the center to create an island
    if (worldShape === EWorldShape.CIRCLE) {
      const distanceToCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      const distanceRatio = distanceToCenter / maxDistanceToCenter;
      value = value * (1 - Math.pow(distanceRatio, worldShapePower));
    } else if (worldShape === EWorldShape.RECTANGLE) {
      const distanceRatio = Math.max(
        Math.abs(x - centerX) / (width / 2),
        Math.abs(y - centerY) / (height / 2),
      );
      value = value * (1 - Math.pow(distanceRatio, worldShapePower));
    }
    return value * 255;
  };

  for (let x = cursor[0]; x < cursor[2]; x++) {
    for (let y = cursor[1]; y < cursor[3]; y++) {
      heightmap.set(x, y, getHeight(x, y));
    }
  }
}

const ctx: Worker = self as any;

ctx.onmessage = (event: MessageEvent) => {
  const { options, heightmap: heightmapData, cursor } = event.data;
  const { size: { width, height } } = options;
  console.time('terrain worker: setup');
  const heightmap = ndarray(new Uint8ClampedArray(heightmapData), [width, height]);
  console.timeEnd('terrain worker: setup');

  console.time('terrain worker: heightmap');
  generateHeightmap(options, heightmap, cursor);
  console.timeEnd('terrain worker: heightmap');

  ctx.postMessage(true);

}
