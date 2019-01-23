import { WorldMap } from './../../common/WorldMap';
import { EMoistureZone } from './../../simulation/worldTypes';
import { EBiome, ETerrainType } from '../../simulation/worldTypes';
import { terrainTypeLabels, cellFeatureLabels, temperatureZoneTitles, moistureZoneTitles } from "../../simulation/labels";
import { Sprite, Graphics, Point, Container, Text, TextStyle } from 'pixi.js';
import { IWorldCell, ECellFeature, ECellType, ETemperatureZone } from '../../simulation/worldTypes';
import { climateColors } from '../../simulation/colors';
import { IWorldRendererOptions } from './WorldRenderer';
import colormap from 'colormap';
import { mapEnum } from '../../utils/enums';


function rgbToNumber(r: number, g: number, b: number): number {
  return 0x1000000 + b + 0x100 * g + 0x10000 * r;
}

export enum EMapMode {
  CLIMATE = "climate",
  FEATURES = "features",
  TERRAIN = "terrain",
  HEIGHT = "height",
  TEMPERATURE = "temperature",
  MOISTURE = "moisture",
  UPSTREAM_COUNT = "upstream_count",
  DRAINAGE_BASINS = "drainage_basins",
  MOISTURE_ZONES = "moisture_zones",
  TEMPERATURE_ZONES = "temperature_zones",
  TERRAIN_ROUGHNESS = "terrain_roughness",
  POLITICAL = "political",
  POPULATION = "population",
}

// UI uses this
export const mapModeDesc = {
  [EMapMode.CLIMATE]: "Climate",
  [EMapMode.FEATURES]: "Features",
  [EMapMode.TERRAIN]: "Terrain",
  [EMapMode.HEIGHT]: "Height",
  [EMapMode.TEMPERATURE]: "Temperature",
  [EMapMode.MOISTURE]: "Moisture",
  [EMapMode.UPSTREAM_COUNT]: "Upstream count",
  [EMapMode.DRAINAGE_BASINS]: "Drainage basins",
  [EMapMode.MOISTURE_ZONES]: "Moisture zones",
  [EMapMode.TEMPERATURE_ZONES]: "Temperature zones",
  [EMapMode.TERRAIN_ROUGHNESS]: "Terrain Roughness",
  [EMapMode.POLITICAL]: "Political",
  [EMapMode.POPULATION]: "Population",
}

const featureColors = {
  [ECellFeature.OCEANIC]: 0x215b77,
  [ECellFeature.LAND]: 0x809973,
  [ECellFeature.LAKE]: 0x4a749b,
  [ECellFeature.COASTAL]: 0x367593,
}

export const terrainTypeColors: Record<string, number> = {
  [ETerrainType.NONE]: 0x215b77,
  [ETerrainType.PLAIN]: 0xc9d142,
  [ETerrainType.FOOTHILLS]: 0x56914d,
  [ETerrainType.PLATEAU]: 0x939311,
  [ETerrainType.HIGHLANDS]: 0x7a7a50,
}

export const temperatureZoneColors: Record<string, number> = {
  [ETemperatureZone.ARCTIC]: 0xcbd8ed,
  [ETemperatureZone.SUBARCTIC]: 0x677a5f,
  [ETemperatureZone.TEMPERATE]: 0x428725,
  [ETemperatureZone.SUBTROPICAL]: 0xF57F33,
  [ETemperatureZone.TROPICAL]: 0x9E486F,
}

export const moistureZoneColors: Record<string, number> = {
  [EMoistureZone.BARREN]: 0xAC3931,
  [EMoistureZone.ARID]: 0xE5D352,
  [EMoistureZone.SEMIARID]: 0xD9E76C,
  [EMoistureZone.SEMIWET]: 0x73C4C1,
  [EMoistureZone.WET]: 0x5595D6,
}

export interface IMapMode {
  title: string;
  worldMap: WorldMap;
  showLegend: boolean;

  renderChunk(
    renderOptions: IWorldRendererOptions,
    cells: IWorldCell[],
    chunkPosition: Point,
  ): Sprite;
  renderLegend?(): Container;
  getCellColor(cell: IWorldCell): number;
}

// map mode with cell groups and rendering as a colored rectangle
interface IGroupDef {
  name: string
  color?: number,
  showLegend?: boolean,
  paintCell(cell: IWorldCell): number | null
}

class GroupedCellsMapMode implements IMapMode {
  title: string;
  groups: IGroupDef[];
  worldMap: WorldMap;
  showLegend: boolean;
  color: number;

  constructor(
    options: {
      title: string,
      groups: IGroupDef[],
      showLegend?: boolean,
      color?: number,
    },
    worldMap: WorldMap
  ) {
    this.title = options.title;
    this.worldMap = worldMap;
    this.groups = options.groups;
    this.showLegend = options.showLegend || false;
    this.color = options.color || 0x000000;
  }

  renderLegend() {
    const g = new PIXI.Graphics(true);
    const WIDTH = 200;
    const PADDING = 15;
    const CELL_WIDTH = 20;
    const CELL_HEIGHT = 20;
    const HEIGHT = (2 * PADDING) + ((this.groups.length + 1) * (CELL_HEIGHT + PADDING));

    g.beginFill(0x000000, 0.5);
    g.drawRect(0, 0, WIDTH, HEIGHT);
    g.endFill();

    const textStyle = new TextStyle({
      fontSize: 14,
      fill: 0xFFFFFF,
    });

    let currentX = PADDING;
    let currentY = PADDING;
    let groupTexts = [];
    for (const group of this.groups) {
      if (group.color)
      g.beginFill(group.color)
      g.drawRect(currentX, currentY, CELL_WIDTH, CELL_HEIGHT);
      g.endFill();

      g.lineColor = 0xFFFFFF;
      g.lineWidth = 1.5;
      g.drawRect(currentX, currentY, CELL_WIDTH, CELL_HEIGHT);

      const text = new Text(group.name, textStyle);
      text.position.set(
        currentX + CELL_WIDTH + PADDING,
        currentY,
      );
      groupTexts.push(text);
      currentY += (CELL_HEIGHT + PADDING);
    }

    const texture = g.generateCanvasTexture();
    const sprite = new Sprite(texture);
    sprite.interactive = true;
    const container = new Container();
    container.addChild(sprite);
    for (const text of groupTexts) {
      container.addChild(text);
    }
    return container;
  }

  getCellColor(cell: IWorldCell) {
    for (const group of this.groups) {
      const color = group.paintCell(cell);
      if (color !== null) {
        return color;
      }
    }
  }

  renderChunk(
    renderOptions: IWorldRendererOptions,
    cells: IWorldCell[],
    chunkPosition: Point,
  ): Sprite {
    const { cellWidth, cellHeight } = renderOptions;
    const g = new PIXI.Graphics(true);
    const groupedCells: Record<string, IWorldCell[]> = {};

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
  worldMap: WorldMap;

  constructor(
    options: {
      title: string,
      datapoint: string,
      colormap: string,
      showLegend?: boolean,
    },
    worldMap: WorldMap
  ) {
    this.title = options.title;
    this.worldMap = worldMap;
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
    for (const cell of worldMap.world.cells) {
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

  getCellColor(cell: IWorldCell) {
    const { min, max, colors } = this.mapData;
    const index = Math.round(((cell[this.datapoint] - min) / (max - min)) * 100);
    let color: number[] = [0, 0, 0];
    if (!isNaN(index)) {
      color = colors[index];
    }
    return rgbToNumber(color[0], color[1], color[2]);
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
    cells: IWorldCell[],
    chunkPosition: Point,
  ): Sprite {
    const { cellWidth, cellHeight } = renderOptions;
    const g = new PIXI.Graphics(true);
    const { min, max, colors } = this.mapData;
    let index: number;
    let color: number[];
    const cellsByColor: Record<any, IWorldCell[]> = {};
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

export type MapModeDef = (worldMap: WorldMap) => IMapMode
export type MapModeMap = Partial<Record<EMapMode, MapModeDef>>;

export const mapModes: MapModeMap = {
  [EMapMode.CLIMATE]: (worldMap: WorldMap) => (
    new GroupedCellsMapMode({
      title: 'Climate',
      groups: [
        {
          name: 'coastal',
          paintCell: (cell: IWorldCell) => (
              cell.feature === ECellFeature.COASTAL ||
              cell.feature === ECellFeature.LAKE
            )
            ? climateColors.ocean.coast
            : null,
        },
        {
          name: 'rivers',
          paintCell: (cell: IWorldCell) => cell.riverType > 0
            ? climateColors.ocean.coast
            : null,
        },
        {
          name: 'ocean',
          paintCell: (cell: IWorldCell) => (
            cell.type === ECellType.OCEAN
              ? climateColors.ocean.deep
              : null
          )
        },
        ...Object.values(EBiome).map(biome => ({
          name: `biome-${biome}`,
          paintCell: (cell: IWorldCell) => {
            if (cell.biome === biome) {
              const color = climateColors.biomes[biome];
              if (typeof color === 'object') {
                return color[cell.terrainType];
              }
              return color;
            }
            return null;
          }
        }))
      ]
    },
    worldMap)
  ),
  [EMapMode.FEATURES]: (worldMap: WorldMap) => (
    new GroupedCellsMapMode({
      title: 'Features',
      showLegend: true,
      groups: mapEnum(ECellFeature).map(({ name, id }) => ({
        name: cellFeatureLabels[id],
        color: featureColors[id],
        paintCell: (cell: IWorldCell) => (
          cell.feature === id
            ? featureColors[id]
            : null
        )
      })),
    }, worldMap)
  ),
  [EMapMode.TERRAIN]: (worldMap: WorldMap) => (
    new GroupedCellsMapMode({
      title: 'Terrain',
      showLegend: true,
      groups: mapEnum(ETerrainType).map(({ name, id }) => ({
        name: terrainTypeLabels[id],
        color: terrainTypeColors[id],
        paintCell: (cell: IWorldCell) => (
          cell.terrainType === id
            ? terrainTypeColors[id]
            : null
        )
      }))
    }, worldMap)
  ),
  [EMapMode.DRAINAGE_BASINS]: (worldMap: WorldMap) => (
    new GroupedCellsMapMode({
      title: 'Drainage Basins',
      groups: [
        {
          name: `drainage-basins`,
          paintCell: (cell: IWorldCell) => (
            cell.drainageBasin
              ? cell.drainageBasin.color
              : 0xFFF
          )
        }
      ]
    }, worldMap)
  ),
  [EMapMode.HEIGHT]: (worldMap: WorldMap) => (
    new ColormapMapMode({
      title: 'Height',
      datapoint: 'height',
      colormap: 'bathymetry'
    }, worldMap)
  ),
  [EMapMode.TEMPERATURE]: (worldMap: WorldMap) => (
    new ColormapMapMode({
      title: 'Temperature',
      datapoint: 'temperature',
      colormap: 'jet'
    }, worldMap)
  ),
  [EMapMode.MOISTURE]: (worldMap: WorldMap) => (
    new ColormapMapMode({
      title: 'Moisture',
      datapoint: 'moisture',
      colormap: 'viridis'
    }, worldMap)
  ),
  [EMapMode.UPSTREAM_COUNT]: (worldMap: WorldMap) => (
    new ColormapMapMode({
      title: 'Upstream Count',
      datapoint: 'upstreamCount',
      colormap: 'velocity-blue'
    }, worldMap)
  ),
  [EMapMode.MOISTURE_ZONES]: (worldMap: WorldMap) => (
    new GroupedCellsMapMode({
      title: 'Moisture Zones',
      showLegend: true,
      groups: mapEnum(ETerrainType).map(({ name, id }) => ({
        name: moistureZoneTitles[id],
        color: moistureZoneColors[id],
        paintCell: (cell: IWorldCell) => (
          cell.moistureZone === id
            ? moistureZoneColors[id]
            : null
        )
      }))
    }, worldMap)
  ),
  [EMapMode.TEMPERATURE_ZONES]: (worldMap: WorldMap) => (
    new GroupedCellsMapMode({
      title: 'Temperature Zones',
      showLegend: true,
      groups: mapEnum(ETerrainType).map(({ name, id }) => ({
        name: temperatureZoneTitles[id],
        color: temperatureZoneColors[id],
        paintCell: (cell: IWorldCell) => (
          cell.temperatureZone === id
            ? temperatureZoneColors[id]
            : null
        )
      }))
    }, worldMap)
  ),
  [EMapMode.TERRAIN_ROUGHNESS]: (worldMap: WorldMap) => (
    new ColormapMapMode({
      title: 'Terrain Roughness',
      datapoint: 'terrainRoughness',
      colormap: 'greens'
    }, worldMap)
  ),
}
