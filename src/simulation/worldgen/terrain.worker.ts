import ndarray from 'ndarray';
import Alea from 'alea';
import SimplexNoise from 'simplex-noise';
import fill from 'ndarray-fill';
import { IWorldgenOptions, EWorldShape } from '../types';


function generateHeightmap(options: IWorldgenOptions) {
  const { seed, size: { width, height }, worldShape, worldShapePower } = options;

  const heightmap = ndarray(new Uint8ClampedArray(width * height), [width, height]);
  // const bigHeightmap = ndarray(new Uint8ClampedArray(width * height * 10), [width * 10, height * 10]);
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

  fill(heightmap, getHeight);
  // fill(bigHeightmap, (x: number, y: number) => getHeight(x / 10, y / 10));

  return heightmap;
}

const ctx: Worker = self as any;

ctx.onmessage = (event: MessageEvent) => {
  const options: IWorldgenOptions = event.data;

  console.group('terrain worker');
  console.time('step: heightmap');
  let heightmap = generateHeightmap(options);
  console.timeEnd('step: heightmap');
  console.groupEnd();

  ctx.postMessage({
    heightmap: heightmap.data,
  }, [(heightmap.data as any).buffer]);

}
