import { Sprite, Graphics, Point } from 'pixi.js';
import World, { Cell, climateColors, ETerrainType } from '../../simulation/world';
import { IWorldRendererOptions } from './WorldRenderer';
import { ChunkRenderer } from './ChunkRenderer';
import { chunk } from 'simple-statistics';


interface IMapModeDef {
  title: string;
  options?: Record<string, any>;
  initState?: (world: World) => any,
  renderChunk: (
    chunkRenderer: ChunkRenderer,
    cells: Cell[],
    mapModeState: any,
    chunkPosition: Point,
  ) => Sprite,
}

export enum EMapMode {
  CLIMATE = "climate",
  // TERRAIN = "terrain",
  // HEIGHT = "height",
  // TEMPERATURE = "temperature",
  // MOISTURE = "moisture",
  // UPSTREAMCOUNT = "upstream_count",
  // DRAINAGEBASINS = "drainage_basins",
}

export const mapModes: Record<EMapMode, IMapModeDef> = {
  [EMapMode.CLIMATE]: {
    title: 'Climate',
    renderChunk: renderClimate
  },
  // [EMapMode.TERRAIN]: {
  //   title: 'Terrain',
  // },
  // [EMapMode.HEIGHT]: {
  //   title: 'Height',
  //   options: {
  //     datapoint: 'height',
  //     colormap: 'bathymetry'
  //   }
  // },
  // [EMapMode.TEMPERATURE]: {
  //   title: 'Temperature',
  //   options: {
  //     datapoint: 'temperature',
  //     colormap: 'jet',
  //   },
  // },
  // [EMapMode.MOISTURE]: {
  //   title: 'Moisture',
  //   options: {
  //     datapoint: 'moisture',
  //     colormap: 'cool',
  //   },
  // },
  // [EMapMode.UPSTREAMCOUNT]: {
  //   title: 'Upstream Cell Count',
  //   options: {
  //     datapoint: 'upstreamCount',
  //     colormap: 'velocity-blue',
  //   },
  // },
  // [EMapMode.DRAINAGEBASINS]: {
  //   title: 'Drainage Basins',
  // }
}


function renderClimate(
  chunkRenderer: ChunkRenderer,
  cells: Cell[],
  mapModeState: any,
  chunkPosition: Point,
): Sprite {
  const { cellWidth, cellHeight, chunkWidth, chunkHeight } = chunkRenderer.options;
  const g = new PIXI.Graphics(true);

  // g.beginFill(0x000000);
  // g.drawRect(0, 0, chunkWidth * cellWidth, chunkHeight * cellHeight);
  // g.endFill();

  const deepOceanCells: Cell[] = [];
  const coastalOceanCells: Cell[] = [];
  const landCells: Record<number, Cell[]> = {};

  for (const cell of cells) {
    if (
      cell.terrainType === ETerrainType.COAST ||
      cell.terrainType === ETerrainType.LAKE ||
      cell.terrainType === ETerrainType.RIVER
    ) {
      coastalOceanCells.push(cell);
    } else if (cell.terrainType === ETerrainType.OCEAN) {
      deepOceanCells.push(cell);
    } else {
      if (cell.biome in landCells) {
        landCells[cell.biome].push(cell);
      } else {
        landCells[cell.biome] = [cell];
      }
    }
  }

  // draw deep ocean
  g.beginFill(climateColors.ocean.deep);
  for (const cell of deepOceanCells) {
    g.drawRect(
      (cell.x * cellWidth) - chunkPosition.x,
      (cell.y * cellHeight) - chunkPosition.y,
      cellWidth,
      cellHeight
    );
  }
  g.endFill();

  // draw coast, rivers, lakes
  g.beginFill(climateColors.ocean.coast);
  for (const cell of coastalOceanCells) {
    g.drawRect(
      (cell.x * cellWidth) - chunkPosition.x,
      (cell.y * cellHeight) - chunkPosition.y,
      cellWidth,
      cellHeight
    );
  }
  g.endFill();

  // draw each biome
  for (const [biome, cells] of Object.entries(landCells)) {
    g.beginFill(climateColors.biomes[biome]);
    for (const cell of cells) {
      g.drawRect(
        (cell.x * cellWidth) - chunkPosition.x,
        (cell.y * cellHeight) - chunkPosition.y,
        cellWidth,
        cellHeight
      );
    }
    g.endFill();
  }

  return new Sprite(g.generateCanvasTexture());
}
