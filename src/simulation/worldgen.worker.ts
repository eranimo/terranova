import ndarray from 'ndarray';
import Alea from 'alea';
import SimplexNoise from 'simplex-noise';
import fill from 'ndarray-fill';
import ops from 'ndarray-ops';
import { IWorldgenOptions, IWorldgenWorkerOutput } from './simulation';
import { ETerrainType } from './world';


function ndarrayStats(ndarray: ndarray) {
  return {
    array: ndarray,
    avg: ops.sum(ndarray) / (ndarray.shape[0] * ndarray.shape[0]),
    max: ops.sup(ndarray),
    min: ops.inf(ndarray),
  };
}

function generateHeightmap(options: IWorldgenOptions) {
  const { seed, size: { width, height } } = options;

  const heightmap = ndarray(new Uint8ClampedArray(width * height), [width, height]);
  const rng = new Alea(seed);
  const simplex = new SimplexNoise(rng);
  const noise = (nx, ny) => simplex.noise2D(nx, ny);
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const maxDistanceToCenter = 2 * Math.sqrt(Math.pow(width, 2) + Math.pow(width, 2));

  fill(heightmap, (x, y) => {
    // use simplex noise to create random terrain
    const nx = x / width - 0.5;
    const ny = y / height - 0.5;
    let value = (
      0.60 * noise(2.50 * nx, 2.50 * ny) +
      0.20 * noise(5.00 * nx, 5.00 * ny) +
      0.10 * noise(10.0 * nx, 10.0 * ny)
    );
    value = (value + 1) / 2;

    // decrease the height of cells farther away from the center to create an island
    const d = (2 * Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)) / maxDistanceToCenter) / 0.5;
    const a = 0;
    const b = 1.8;
    const c = 2.2;
    value = (value + a) * (1 - b * Math.pow(d, c));
    return value * 255;
  });

  return heightmap;
}

function decideTerrainTypes(options: IWorldgenOptions, sealevel: number, heightmap: ndarray) {
  const { size: { width, height } } = options;
  const terrainTypes = ndarray(new Int16Array(width * height), [width, height]);
  let oceanCells = 0;
  fill(terrainTypes, (x, y) => {
    const height = heightmap.get(x, y);
    if (height <= sealevel) {
      oceanCells++;
      return ETerrainType.OCEAN;
    }
    return ETerrainType.LAND;
  });
  console.log('Ocean percent', oceanCells / (width * height));
  return terrainTypes;
}

onmessage = function (event: MessageEvent) {
  const options: IWorldgenOptions = event.data;
  const sealevel = 102;
  const heightmap = generateHeightmap(options);
  const terrainTypes = decideTerrainTypes(options, sealevel, heightmap);

  const output: IWorldgenWorkerOutput = {
    options,
    sealevel,
    heightmap: heightmap.data,
    terrainTypes: terrainTypes.data,
  };
  postMessage(output);
}
