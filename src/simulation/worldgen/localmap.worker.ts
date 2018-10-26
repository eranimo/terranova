import { IWorldgenOptions } from './types';
import ndarray from 'ndarray';
import { ILocalMapOptions, EWorldShape } from './types';
import { getHeightFactory } from './utils';
import fill from 'ndarray-fill';


function generateHeightmap(
  worldOptions: IWorldgenOptions,
  localOptions: ILocalMapOptions,
) {
  const worldSize = worldOptions.size;
  const { size, offset } = localOptions;
  const { width, height } = size;

  const heightmap = ndarray(new Uint8ClampedArray(width * height), [width, height]);
  const getHeight = getHeightFactory(
    worldOptions.size,
    worldOptions.worldShape,
    worldOptions.worldShapePower,
    worldOptions.seed,
  );

  fill(heightmap, (x, y) => getHeight(
    ((offset.x * width) + x) / 10,
    ((offset.y * height) + y) / 10,
  ));

  return heightmap;
}

const ctx: Worker = self as any;

ctx.onmessage = (event: MessageEvent) => {
  const { worldOptions, localOptions } = event.data;

  const heightmap = generateHeightmap(worldOptions, localOptions);

  ctx.postMessage(heightmap.data, [(heightmap.data as any).buffer]);
}
