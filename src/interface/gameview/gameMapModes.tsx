import { EMapMode, mapModes, MapModeMap, IMapMode } from '../worldview/mapModes';
import { IWorldRendererOptions } from '../worldview/WorldRenderer';
import { IWorldCell } from '../../simulation/worldTypes';
import { Point, Sprite } from 'pixi.js';
import { WorldMap } from '../../common/WorldMap';


class RegionMapMode implements IMapMode {
  title: string;
  worldMap: WorldMap;
  showLegend: boolean;

  constructor(
    options: {
      title: string,
    },
    worldMap: WorldMap
  ) {
    this.title = options.title;
    this.worldMap = worldMap;
    this.showLegend = false;
  }

  getCellColor() {
    return 0;
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
  [EMapMode.POLITICAL]: (worldMap: WorldMap) => (
    new RegionMapMode({
      title: 'Political Map',
    }, worldMap)
  )
}
