import { groupBy } from 'lodash';
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
  TERRAIN = "terrain",
  // HEIGHT = "height",
  // TEMPERATURE = "temperature",
  // MOISTURE = "moisture",
  // UPSTREAMCOUNT = "upstream_count",
  DRAINAGEBASINS = "drainage_basins",
}

const terrainColors = {
  [ETerrainType.OCEAN]: 0x215b77,
  [ETerrainType.LAND]: 0x809973, // replace with Low and High land
  [ETerrainType.RIVER]: 0x5292B5,
  [ETerrainType.LAKE]: 0x4a749b,
  [ETerrainType.COAST]: 0x367593,
  [ETerrainType.MOUNTAIN]: 0x705e55,
}

export const mapModes: Record<EMapMode, IMapModeDef> = {
  [EMapMode.CLIMATE]: {
    title: 'Climate',
    renderChunk: renderClimate
  },
  [EMapMode.TERRAIN]: {
    title: 'Terrain',
    renderChunk: drawTerrain
  },
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
  [EMapMode.DRAINAGEBASINS]: {
    title: 'Drainage Basins',
    renderChunk: makeDrainageBasins
  }
}


function renderClimate(
  chunkRenderer: ChunkRenderer,
  cells: Cell[],
  mapModeState: any,
  chunkPosition: Point,
): Sprite {
  const { cellWidth, cellHeight } = chunkRenderer.options;
  const g = new PIXI.Graphics(true);

  const deepOceanCells: Cell[] = [];
  const coastalOceanCells: Cell[] = [];
  const landCells: Record<string, Cell[]> = {};

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

function drawTerrain(
  chunkRenderer: ChunkRenderer,
  cells: Cell[],
  mapModeState: any,
  chunkPosition: Point,
): PIXI.Sprite {
  const { cellWidth, cellHeight } = chunkRenderer.options;
  const g = new PIXI.Graphics(true);

  const cellsByTerrainType = groupBy(Array.from(cells), (cell: Cell) => cell.terrainType);

  for (const [terrain, cells] of Object.entries(cellsByTerrainType)) {
    g.beginFill(terrainColors[terrain]);
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

  return new PIXI.Sprite(g.generateCanvasTexture());
}


function makeDrainageBasins(
  chunkRenderer: ChunkRenderer,
  cells: Cell[],
  mapModeState: any,
  chunkPosition: Point,
): PIXI.Sprite {
  const { cellWidth, cellHeight, chunkWidth, chunkHeight } = chunkRenderer.options;
  const g = new PIXI.Graphics(true);

  for (const cell of cells) {
    if (cell.drainageBasin) {
      g.beginFill(cell.drainageBasin.color);
      g.drawRect(
        (cell.x * cellWidth) - chunkPosition.x,
        (cell.y * cellHeight) - chunkPosition.y,
        cellWidth,
        cellHeight
      );
      g.endFill();
    } else {
      g.beginFill(0x000000);
      g.drawRect(
        (cell.x * cellWidth) - chunkPosition.x,
        (cell.y * cellHeight) - chunkPosition.y,
        cellWidth,
        cellHeight
      );
      g.endFill();
    }
  }
  return new PIXI.Sprite(g.generateCanvasTexture());
}
