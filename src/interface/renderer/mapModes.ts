import { EBiome } from './../../simulation/world';
import { Sprite, Graphics, Point, Container, Text, TextStyle } from 'pixi.js';
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

export const mapModeDesc = {
  [EMapMode.CLIMATE]: "Climate",
  [EMapMode.FEATURES]: "Features",
  [EMapMode.HEIGHT]: "Height",
  [EMapMode.TEMPERATURE]: "Temperature",
  [EMapMode.MOISTURE]: "Moisture",
  [EMapMode.UPSTREAMCOUNT]: "Upstream count",
  [EMapMode.DRAINAGEBASINS]: "Drainage basins",
  [EMapMode.MOISTUREZONES]: "Moisture zones",
  [EMapMode.TEMPERATUREZONES]: "Temperature zones",
  [EMapMode.TERRAINROUGHNESS]: "Terrain Roughness",
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
  title: string;
  chunkRenderer: ChunkRenderer;
  showLegend?: boolean;

  renderChunk(
    renderOptions: IWorldRendererOptions,
    cells: Cell[],
    chunkPosition: Point,
  ): Sprite;
  renderLegend?(): Container;
}

// map mode with cell groups and rendering as a colored rectangle
interface IGroupDef {
  name: string
  paintCell(cell: Cell): number | null
}

class GroupedCellsMapMode implements IMapMode {
  title: string;
  groups: IGroupDef[];
  chunkRenderer: ChunkRenderer;

  constructor(
    options: {
      title: string,
      groups: IGroupDef[]
    },
    chunkRenderer: ChunkRenderer
  ) {
    this.title = options.title;
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
  title: string;
  datapoint: string;
  colormap: string;
  showLegend: boolean;
  mapData: {
    min: number,
    max: number,
    colors: [number, number, number, number][],
    quantiles: { [quantile: number]: number},
  }
  chunkRenderer: ChunkRenderer;

  constructor(
    options: {
      title: string,
      datapoint: string,
      colormap: string,
      showLegend?: boolean,
    },
    chunkRenderer: ChunkRenderer
  ) {
    this.title = options.title;
    this.chunkRenderer = chunkRenderer;
    this.datapoint = options.datapoint;
    this.colormap = options.colormap;
    this.showLegend = options.showLegend !== false;

    const colors: [number, number, number, number][] = colormap({
      nshades: 101,
      format: 'rba',
      colormap: this.colormap
    });
    let item;
    let min = Infinity;
    let max = -Infinity;
    const data = [];
    for (const cell of chunkRenderer.world.cells) {
      item = cell[options.datapoint];
      data.push(item);
      if (item < min) {
        min = item;
      } else if (item > max) {
        max = item;
      }
    }
    const quantiles = {};
    for (let i = 0; i <= 100; i+= 1) {
      quantiles[i] = Math.round(min + ((i / 100) * (max - min)));
    }
    this.mapData = { min, max, colors, quantiles };
  }

  renderLegend() {
    const g = new PIXI.Graphics();
    const V_PADDING = 15;
    const H_PADDING = 15;
    const WIDTH = this.mapData.colors.length * 3 + (H_PADDING * 2);
    const HEIGHT = 120;

    // draw legend background
    g.beginFill(0x000000, 0.5);
    g.drawRect(0, 0, WIDTH, HEIGHT);
    g.endFill();

    // legend bars
    const barsWidth = (WIDTH - (H_PADDING * 2));
    const barWidth = barsWidth / this.mapData.colors.length;
    const barHeight = 20;
    const barX = H_PADDING;
    const barY = V_PADDING * 2;
    for (let i = 0; i < this.mapData.colors.length; i++) {
      const color = this.mapData.colors[i];
      g.beginFill(rgbToNumber(color[0], color[1], color[2]));
      g.drawRect(barX + (i * barWidth), barY, barWidth, barHeight)
      g.endFill();
    }

    // border around legend bars
    g.lineColor = 0xFFFFFF;
    g.lineWidth = 1.5;
    g.drawRect(barX, barY, barsWidth, barHeight);

    const texture = g.generateCanvasTexture();
    const container = new Container();
    const barsSprite = new Sprite(texture)
    container.addChild(barsSprite);

    // legend labels
    const title = new Text(
      `${this.title} Legend`,
      { fontSize: 14, fill: 0xFFFFFF }
    );
    title.position.set(
      H_PADDING,
      V_PADDING - 5,
    );
    container.addChild(title);
    const textStyle = new TextStyle({
      fontSize: 10,
      fill: 0xFFFFFF,
    });
    const renderText = (number, position) => {
      const lowText = new Text(number.toString(), textStyle);
      lowText.anchor.set(0.5, 0.5);
      lowText.position.set(
        barX + position,
        barY + barHeight + 10,
      );
      container.addChild(lowText);
    }

    renderText(this.mapData.quantiles[0], 0);
    renderText(this.mapData.quantiles[25], barsWidth * 0.25);
    renderText(this.mapData.quantiles[50], barsWidth * 0.5);
    renderText(this.mapData.quantiles[75], barsWidth * 0.75);
    renderText(this.mapData.quantiles[100], barsWidth);

    return container;
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

type MapModeDef = (chunkRenderer: ChunkRenderer) => IMapMode

export const mapModes: Partial<Record<EMapMode, MapModeDef>> = {
  [EMapMode.CLIMATE]: (chunkRenderer: ChunkRenderer) => (
    new GroupedCellsMapMode({
      title: 'Climate',
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
  [EMapMode.FEATURES]: (chunkRenderer: ChunkRenderer) => (
    new GroupedCellsMapMode({
      title: 'Features',
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
  ),
  [EMapMode.DRAINAGEBASINS]: (chunkRenderer: ChunkRenderer) => (
    new GroupedCellsMapMode({
      title: 'Drainage Basins',
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
  ),
  [EMapMode.HEIGHT]: (chunkRenderer: ChunkRenderer) => (
    new ColormapMapMode({
      title: 'Height',
      datapoint: 'height',
      colormap: 'bathymetry'
    }, chunkRenderer)
  ),
  [EMapMode.TEMPERATURE]: (chunkRenderer: ChunkRenderer) => (
    new ColormapMapMode({
      title: 'Temperature',
      datapoint: 'temperature',
      colormap: 'jet'
    }, chunkRenderer)
  ),
  [EMapMode.MOISTURE]: (chunkRenderer: ChunkRenderer) => (
    new ColormapMapMode({
      title: 'Moisture',
      datapoint: 'moisture',
      colormap: 'cool'
    }, chunkRenderer)
  ),
  [EMapMode.UPSTREAMCOUNT]: (chunkRenderer: ChunkRenderer) => (
    new ColormapMapMode({
      title: 'Upstream Count',
      datapoint: 'upstreamCount',
      colormap: 'velocity-blue'
    }, chunkRenderer)
  ),
  [EMapMode.MOISTUREZONES]: (chunkRenderer: ChunkRenderer) => (
    new ColormapMapMode({
      title: 'Moisture Zones',
      datapoint: 'moistureZone',
      colormap: 'cool',
      showLegend: false,
    }, chunkRenderer)
  ),
  [EMapMode.TEMPERATUREZONES]: (chunkRenderer: ChunkRenderer) => (
    new ColormapMapMode({
      title: 'Temperature Zones',
      datapoint: 'temperatureZone',
      colormap: 'temperature',
      showLegend: false,
    }, chunkRenderer)
  ),
  [EMapMode.TERRAINROUGHNESS]: (chunkRenderer: ChunkRenderer) => (
    new ColormapMapMode({
      title: 'Terrain Roughness',
      datapoint: 'terrainRoughness',
      colormap: 'greens'
    }, chunkRenderer)
  ),
}
