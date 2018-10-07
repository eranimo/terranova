import { groupBy } from 'lodash';
import { Sprite, Graphics, Point } from 'pixi.js';
import World, { Cell, climateColors, ETerrainType } from '../../simulation/world';
import { IWorldRendererOptions } from './WorldRenderer';
import { ChunkRenderer } from './ChunkRenderer';
import colormap from 'colormap';


function rgbToNumber(r: number, g: number, b: number): number {
  return 0x1000000 + b + 0x100 * g + 0x10000 * r;
}

interface IMapModeDef {
  title: string;
  options?: Record<string, any>;
  initState?: (
    options: any,
    cells: Cell[],
  ) => any,
  renderChunk: (
    chunkRenderer: ChunkRenderer,
    cells: Cell[],
    mapModeState: any,
    chunkPosition: Point,
    options?: any,
  ) => Sprite,
}

export enum EMapMode {
  CLIMATE = "climate",
  TERRAIN = "terrain",
  HEIGHT = "height",
  TEMPERATURE = "temperature",
  MOISTURE = "moisture",
  UPSTREAMCOUNT = "upstream_count",
  DRAINAGEBASINS = "drainage_basins",
  MOISTUREZONES = "moisture_zones",
  TEMPERATUREZONES = "temperature_zones",
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
  [EMapMode.HEIGHT]: {
    title: 'Height',
    options: {
      datapoint: 'height',
      colormap: 'bathymetry'
    },
    initState: makeCellOverlayState,
    renderChunk: makeCellOverlay,
  },
  [EMapMode.TEMPERATURE]: {
    title: 'Temperature',
    options: {
      datapoint: 'temperature',
      colormap: 'jet',
    },
    initState: makeCellOverlayState,
    renderChunk: makeCellOverlay,
  },
  [EMapMode.MOISTURE]: {
    title: 'Moisture',
    options: {
      datapoint: 'moisture',
      colormap: 'cool',
    },
    initState: makeCellOverlayState,
    renderChunk: makeCellOverlay,
  },
  [EMapMode.UPSTREAMCOUNT]: {
    title: 'Upstream Cell Count',
    options: {
      datapoint: 'upstreamCount',
      colormap: 'velocity-blue',
    },
    initState: makeCellOverlayState,
    renderChunk: makeCellOverlay,
  },
  [EMapMode.DRAINAGEBASINS]: {
    title: 'Drainage Basins',
    renderChunk: makeDrainageBasins
  },
  [EMapMode.MOISTUREZONES]: {
    title: 'Moisture Zones',
    options: {
      datapoint: 'moistureZone',
      colormap: 'cool',
    },
    initState: makeCellOverlayState,
    renderChunk: makeCellOverlay,
  },
  [EMapMode.TEMPERATUREZONES]: {
    title: 'Temperature Zones',
    options: {
      datapoint: 'temperatureZone',
      colormap: 'temperature',
    },
    initState: makeCellOverlayState,
    renderChunk: makeCellOverlay,
  },
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
  const { cellWidth, cellHeight } = chunkRenderer.options;
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

function makeCellOverlayState(options, cells: Cell[]) {
  const colors: [number, number, number, number][] = colormap({
    nshades: 101,
    format: 'rba',
    colormap: options.colormap
  });
  let item;
  let min = Infinity;
  let max = -Infinity;
  for (const cell of cells) {
    item = cell[options.datapoint];
    if (item < min) {
      min = item;
    } else if (item > max) {
      max = item;
    }
  }
  return { min, max, colors };
}

function makeCellOverlay(
  chunkRenderer: ChunkRenderer,
  cells: Cell[],
  mapModeState: any,
  chunkPosition: Point,
  options: Record<string, any>,
): PIXI.Sprite {
  const g = new PIXI.Graphics(true);
  const { cellWidth, cellHeight } = chunkRenderer.options;
  const { min, max, colors } = mapModeState;
  let index: number;
  let color: number[];
  const cellsByColor: Record<any, Cell[]> = {};
  for (const cell of cells) {
    index = Math.round(((cell[options.datapoint] - min) / (max - min)) * 100);
    if (isNaN(index)) {
      continue;
    }
    color = colors[index];
    if (!color) {
      throw new Error(`No color for index ${index}`);
    }

    if (index in cellsByColor) {
      cellsByColor[index].push(cell);
    } else {
      cellsByColor[index] = [cell];
    }
  }
  for (const [index, colorCells] of Object.entries(cellsByColor)) {
    color = colors[index];
    g.beginFill(rgbToNumber(color[0], color[1], color[2]));
    for (const cell of colorCells) {
      g.drawRect(
        (cell.x * cellWidth) - chunkPosition.x,
        (cell.y * cellHeight) - chunkPosition.y,
        cellWidth,
        cellHeight,
      );
    }
    g.endFill();
  }
  const texture = g.generateCanvasTexture();
  const sprite = new PIXI.Sprite(texture);
  return sprite;
}
