import { mapModeDesc, EMapMode, mapModes, MapModeMap, IMapMode } from '../worldview/mapModes';
import { ChunkRenderer } from '../worldview/ChunkRenderer';
import { IWorldRendererOptions } from '../worldview/WorldRenderer';
import { IWorldCell } from '../../simulation/worldTypes';
import { Point, Sprite } from 'pixi.js';


class RegionMapMode implements IMapMode {
  title: string;
  chunkRenderer: ChunkRenderer;
  showLegend: boolean;

  constructor(
    options: {
      title: string,
    },
    chunkRenderer: ChunkRenderer
  ) {
    this.title = options.title;
    this.chunkRenderer = chunkRenderer;
    this.showLegend = false;
  }

  renderChunk(
    renderOptions: IWorldRendererOptions,
    cells: IWorldCell[],
    chunkPosition: Point,
  ): Sprite {
    const g = new PIXI.Graphics(true);
    return new Sprite(g.generateCanvasTexture());
  }
}

export const gameMapModes: MapModeMap = {
  ...mapModes,
  [EMapMode.POLITICAL]: (chunkRenderer: ChunkRenderer) => (
    new RegionMapMode({
      title: 'Political Map',
    }, chunkRenderer)
  )
}
