import { IWorldMapGenOptions } from '../types';
import ndarray from 'ndarray';
import { IRegionGenInput, EWorldShape } from '../types';
import { getHeightFactory } from './utils';
import fill from 'ndarray-fill';
import { buildWorker } from '../../utils/workers';


function generateHeightmap(
  worldOptions: IWorldMapGenOptions,
  localOptions: IRegionGenInput,
) {
  const worldSize = worldOptions.size;
  const { regionSize, location, scale } = localOptions;
  const { width, height } = regionSize;
  const localWidth = width * scale;
  const localHeight = height * scale;

  const heightmap = ndarray(new Uint8ClampedArray(localWidth * localHeight), [localWidth, localHeight]);
  const getHeight = getHeightFactory(
    worldOptions.size,
    worldOptions.worldShape,
    worldOptions.worldShapePower,
    worldOptions.seed,
  );

  for (let x = 0; x < localWidth; x++) {
    for (let y = 0; y < localWidth; y++) {
      heightmap.set(
        x,
        y,
        getHeight(
          ((location.x * width) + x) / scale,
          ((location.y * height) + y) / scale,
        )
      );
    }
  }

  return heightmap;
}

const ctx: Worker = self as any;
buildWorker(ctx, (payload) => {
  const { worldOptions, localOptions } = payload;
  const heightmap = generateHeightmap(worldOptions, localOptions);

  return {
    payload: {
      heightmap: heightmap.data,
    },
    transfer: [(heightmap.data as any).buffer]
  };
});
