import { EBiome } from './../../simulation/world';
import { groupBy } from 'lodash';
import { Sprite, Graphics, Point } from 'pixi.js';
import World, { Cell, climateColors, ECellFeature, ECellType } from '../../simulation/world';
import { IWorldRendererOptions } from './WorldRenderer';
import { ChunkRenderer } from './ChunkRenderer';
import colormap from 'colormap';


function rgbToNumber(r: number, g: number, b: number): number {
  return 0x1000000 + b + 0x100 * g + 0x10000 * r;
}

export enum EMapMode {
  CLIMATE = "climate",
  FEATURES = "features",
  HEIGHT = "height",
  TEMPERATURE = "temperature",
  MOISTURE = "moisture",
  UPSTREAMCOUNT = "upstream_count",
  DRAINAGEBASINS = "drainage_basins",
  MOISTUREZONES = "moisture_zones",
  TEMPERATUREZONES = "temperature_zones",
  TERRAINROUGHNESS = "terrain_roughness",
}

const featureColors = {
  [ECellFeature.OCEANIC]: 0x215b77,
  [ECellFeature.LOW_LAND]: 0x809973,
  [ECellFeature.HIGH_LAND]: 0x705e55,
  [ECellFeature.RIVER]: 0x5292B5,
  [ECellFeature.LAKE]: 0x4a749b,
  [ECellFeature.COASTAL]: 0x367593,
}

export interface IMapMode {
  chunkRenderer: ChunkRenderer;
  renderChunk(
    renderOptions: IWorldRendererOptions,
    cells: Cell[],
    chunkPosition: Point,
  ): Sprite;
}

// map mode with cell groups and rendering as a colored rectangle
interface IGroupDef {
  name: string
  paintCell(cell: Cell): number | null
}

class GroupedCellsMapMode implements IMapMode {
  groups: IGroupDef[];
  chunkRenderer: ChunkRenderer;

  constructor(
    options: {
      groups: IGroupDef[]
    },
    chunkRenderer: ChunkRenderer
  ) {
    this.chunkRenderer = chunkRenderer;
    this.groups = options.groups;
  }

  renderChunk(
    renderOptions: IWorldRendererOptions,
    cells: Cell[],
    chunkPosition: Point,
  ): Sprite {
    const { cellWidth, cellHeight } = renderOptions;
    const g = new PIXI.Graphics(true);
    const groupedCells: Record<string, Cell[]> = {};

    for (const group of this.groups) {
      groupedCells[group.name] = [];
    }

    for (const cell of cells) {
      for (const group of this.groups) {
        const color = group.paintCell(cell);
        if (color) {
          g.beginFill(color);
          g.drawRect(
            (cell.x * cellWidth) - chunkPosition.x,
            (cell.y * cellHeight) - chunkPosition.y,
            cellWidth,
            cellHeight
          );
          g.endFill();
          break;
        }
      }
    }

    return new Sprite(g.generateCanvasTexture());
  }
}

class ColormapMapMode implements IMapMode {
  datapoint: string;
  colormap: string;
  mapData: {
    min: number,
    max: number,
    colors: [number, number, number, number][],
  }
  chunkRenderer: ChunkRenderer;

  constructor(
    options: {
      datapoint: string,
      colormap: string,
    },
    chunkRenderer: ChunkRenderer
  ) {
    this.chunkRenderer = chunkRenderer;
    this.datapoint = options.datapoint;
    this.colormap = options.colormap;

    const colors: [number, number, number, number][] = colormap({
      nshades: 101,
      format: 'rba',
      colormap: this.colormap
    });
    let item;
    let min = Infinity;
    let max = -Infinity;
    for (const cell of chunkRenderer.world.cells) {
      item = cell[options.datapoint];
      if (item < min) {
        min = item;
      } else if (item > max) {
        max = item;
      }
    }
    this.mapData = { min, max, colors };
  }

  renderChunk(
    renderOptions: IWorldRendererOptions,
    cells: Cell[],
    chunkPosition: Point,
  ): Sprite {
    const { cellWidth, cellHeight } = renderOptions;
    const g = new PIXI.Graphics(true);
    const { min, max, colors } = this.mapData;
    let index: number;
    let color: number[];
    const cellsByColor: Record<any, Cell[]> = {};
    for (const cell of cells) {
      index = Math.round(((cell[this.datapoint] - min) / (max - min)) * 100);
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
    return new Sprite(g.generateCanvasTexture());
  }
}

interface IMapModeDef {
  title: string;
  factory: (chunkRenderer: ChunkRenderer) => IMapMode;
}

export const mapModes: Partial<Record<EMapMode, IMapModeDef>> = {
  [EMapMode.CLIMATE]: {
    title: 'Climate',
    factory: (chunkRenderer: ChunkRenderer) => (
      new GroupedCellsMapMode({
        groups: [
          {
            name: 'coastal',
            paintCell: (cell: Cell) => (
                cell.feature === ECellFeature.COASTAL ||
                cell.feature === ECellFeature.LAKE ||
                cell.feature === ECellFeature.RIVER
              )
              ? climateColors.ocean.coast
              : null,
          },
          {
            name: 'ocean',
            paintCell: (cell: Cell) => (
              cell.type === ECellType.OCEAN
                ? climateColors.ocean.deep
                : null
            )
          },
          ...Object.values(EBiome).map(biome => ({
            name: `biome-${biome}`,
            paintCell: (cell: Cell) => (
              cell.feature !== ECellFeature.RIVER &&
              cell.biome === biome
                ? climateColors.biomes[biome]
                : null
            )
          }))
        ]
      },
      chunkRenderer)
    ),
  },
  [EMapMode.FEATURES]: {
    title: 'Features',
    factory: (chunkRenderer: ChunkRenderer) => (
      new GroupedCellsMapMode({
        groups: [
          ...Object.values(ECellFeature).map(cellFeature => ({
            name: `feature-${cellFeature}`,
            paintCell: (cell: Cell) => (
              cell.feature === cellFeature
                ? featureColors[cellFeature]
                : null
            )
          }))
        ]
      }, chunkRenderer)
    )
  },
  [EMapMode.DRAINAGEBASINS]: {
    title: 'Drainage Basins',
    factory: (chunkRenderer: ChunkRenderer) => (
      new GroupedCellsMapMode({
        groups: [
          {
            name: `drainage-basins`,
            paintCell: (cell: Cell) => (
              cell.drainageBasin
                ? cell.drainageBasin.color
                : 0xFFF
            )
          }
        ]
      }, chunkRenderer)
    )
  },
  [EMapMode.HEIGHT]: {
    title: 'Height',
    factory: (chunkRenderer: ChunkRenderer) => (
      new ColormapMapMode({
        datapoint: 'height',
        colormap: 'bathymetry'
      }, chunkRenderer)
    )
  },
  [EMapMode.TEMPERATURE]: {
    title: 'Temperature',
    factory: (chunkRenderer: ChunkRenderer) => (
      new ColormapMapMode({
        datapoint: 'temperature',
        colormap: 'jet'
      }, chunkRenderer)
    )
  },
  [EMapMode.MOISTURE]: {
    title: 'Moisture',
    factory: (chunkRenderer: ChunkRenderer) => (
      new ColormapMapMode({
        datapoint: 'moisture',
        colormap: 'cool'
      }, chunkRenderer)
    )
  },
  [EMapMode.UPSTREAMCOUNT]: {
    title: 'Upstream Count',
    factory: (chunkRenderer: ChunkRenderer) => (
      new ColormapMapMode({
        datapoint: 'upstreamCount',
        colormap: 'velocity-blue'
      }, chunkRenderer)
    )
  },
  [EMapMode.MOISTUREZONES]: {
    title: 'Moisture Zones',
    factory: (chunkRenderer: ChunkRenderer) => (
      new ColormapMapMode({
        datapoint: 'moistureZone',
        colormap: 'cool'
      }, chunkRenderer)
    )
  },
  [EMapMode.TEMPERATUREZONES]: {
    title: 'Temperature Zones',
    factory: (chunkRenderer: ChunkRenderer) => (
      new ColormapMapMode({
        datapoint: 'temperatureZone',
        colormap: 'temperature'
      }, chunkRenderer)
    )
  },
  [EMapMode.TERRAINROUGHNESS]: {
    title: 'Terrain Roughness',
    factory: (chunkRenderer: ChunkRenderer) => (
      new ColormapMapMode({
        datapoint: 'terrainRoughness',
        colormap: 'greens'
      }, chunkRenderer)
    )
  },
}
