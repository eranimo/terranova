import { WorldMap } from './../../common/WorldMap';
import { EMoistureZone } from './../../simulation/worldTypes';
import { EBiome, ETerrainType } from '../../simulation/worldTypes';
import { terrainTypeLabels, cellFeatureLabels, temperatureZoneTitles, moistureZoneTitles } from "../../simulation/labels";
import { Sprite, Graphics, Point, Container, Text, TextStyle, Texture } from 'pixi.js';
import { IWorldCell, ECellFeature, ECellType, ETemperatureZone } from '../../simulation/worldTypes';
import { climateColors } from '../../simulation/colors';
import { IWorldRendererOptions } from './WorldRenderer';
import colormap from 'colormap';
import { mapEnum } from '../../utils/enums';
import { Observable } from 'rxjs';
import Array2D from '../../utils/Array2D';
import { getHexColor, hexToNumber } from '../../utils/color';


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

export class MapMode {
  showLegend?: boolean;
  update$?: Observable<void>;
  chunkCanvases: Array2D<HTMLCanvasElement>;
  chunkContext: Array2D<CanvasRenderingContext2D>;
  chunkTextures: Array2D<Texture>;
  chunkWidth: number; // in px
  chunkHeight: number; // in px

  constructor(
    public title: string,
    public worldMap: WorldMap,
    public renderOptions: IWorldRendererOptions,
  ) {
    this.update$ = new Observable();
    const { width, height } = worldMap.world.size;
    const chunkColumns = width / renderOptions.chunkHeight;
    const chunkRows = height / renderOptions.chunkWidth;

    this.chunkWidth = renderOptions.cellWidth * renderOptions.chunkWidth;
    this.chunkHeight = renderOptions.cellHeight * renderOptions.chunkHeight;

    this.chunkCanvases = new Array2D(chunkColumns, chunkRows, () => {
      const canvas = document.createElement('canvas');
      document.body.appendChild(canvas);
      canvas.hidden = true;
      canvas.width = this.chunkWidth;
      canvas.height = this.chunkHeight;
      return canvas;
    });
    this.chunkContext = new Array2D(chunkColumns, chunkRows, (x, y) => (
      this.chunkCanvases.get(x, y).getContext('2d')
    ));

    this.chunkTextures = new Array2D(chunkColumns, chunkRows, (x, y) => (
      Texture.fromCanvas(this.chunkCanvases.get(x, y))
    ));
  }

  renderLegend?(): Container;

  updateChunk(
    chunkX: number,
    chunkY: number,
    cells: IWorldCell[],
    chunkPosition: Point,
  ): void {
    throw new Error('Not implemented');
  }

  getCellColor(cell: IWorldCell): string {
    throw new Error('Not implemented');
  };
}

// map mode with cell groups and rendering as a colored rectangle
interface IGroupDef {
  name: string;
  color?: number;
  showLegend?: boolean;
  getCellColor(cell: IWorldCell): number | null
}

class GroupedCellsMapMode extends MapMode {
  title: string;
  groups: IGroupDef[];
  showLegend: boolean;
  color: number;

  constructor(
    options: {
      title: string,
      groups: IGroupDef[],
      showLegend?: boolean,
      color?: number,
    },
    worldMap: WorldMap,
    renderOptions: IWorldRendererOptions,
  ) {
    super(options.title, worldMap, renderOptions);
    this.title = options.title;
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
      const color = group.getCellColor(cell);
      if (color !== null) {
        return `#${getHexColor(color)}`;
      }
    }
  }

  updateChunk(
    chunkX: number,
    chunkY: number,
    cells: IWorldCell[],
    chunkPosition: Point,
  ) {
    const { cellWidth, cellHeight } = this.renderOptions;
    const g = this.chunkContext.get(chunkX, chunkY);

    g.clearRect(0, 0, this.chunkWidth, this.chunkHeight)

    const groupedCells: Record<string, IWorldCell[]> = {};

    for (const group of this.groups) {
      groupedCells[group.name] = [];
    }

    let x: number;
    let y: number;
    const cx = cells[0].x;
    const cy = cells[0].y;
    for (const cell of cells) {
      for (const group of this.groups) {
        const color = group.getCellColor(cell);
        if (color) {
          g.fillStyle = `#${getHexColor(color)}`;
          x = (cell.x - cx) * cellWidth;
          y = (cell.y - cy) * cellHeight;
          g.fillRect(x, y, cellWidth, cellHeight);
          break;
        }
      }
    }
  }
}
export interface IColormapMapModeOptions {
  title: string;
  getData: (worldMap: WorldMap, cell: IWorldCell) => number;
  colormap: string;
  showLegend?: boolean;
  update$?: () => Observable<void>;
}

export class ColormapMapMode extends MapMode {
  title: string;
  options: IColormapMapModeOptions;
  mapData: {
    min: number,
    max: number,
    colors: string[],
    quantiles: { [quantile: number]: number},
  };
  showLegend = true;
  chunkGraphics: Record<string, HTMLCanvasElement>;

  constructor(
    options: IColormapMapModeOptions,
    worldMap: WorldMap,
    renderOptions: IWorldRendererOptions,
  ) {
    super(options.title, worldMap, renderOptions);
    this.title = options.title;
    this.options = options;
    if (this.options.update$) {
      this.update$ = this.options.update$();
    }

    const colors: string[] = colormap({
      nshades: 101,
      format: 'hex',
      colormap: this.options.colormap
    });
    let item: number;
    let min = Infinity;
    let max = -Infinity;
    const data = [];
    for (const cell of worldMap.world.cells) {
      item = options.getData(this.worldMap, cell);
      data.push(item);
      if (item < min) {
        min = item;
      } else if (item > max) {
        max = item;
      }
    }
    min = min === Infinity ? 0 : min;
    max = max === -Infinity ? 1 : max;
    const quantiles = {};
    for (let i = 0; i <= 100; i+= 1) {
      quantiles[i] = Math.round(min + ((i / 100) * (max - min)));
    }
    this.mapData = { min, max, colors, quantiles };

    this.chunkGraphics = {};
  }

  getCellColor(cell: IWorldCell) {
    const { min, max, colors } = this.mapData;
    const value = this.options.getData(this.worldMap, cell);
    const index = Math.round(((value - min) / (max - min)) * 100);
    let color: string = '#000000';
    if (!isNaN(index)) {
      color = colors[index];
    }
    return color;
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
      g.beginFill(hexToNumber(color));
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

  updateChunk(
    chunkX: number,
    chunkY: number,
    cells: IWorldCell[],
    chunkPosition: Point,
  ) {
    const { cellWidth, cellHeight } = this.renderOptions;
    const g = this.chunkContext.get(chunkX, chunkY);
    const { min, max, colors } = this.mapData;
    let index: number;
    let value: number;
    let color: string;
    const cellsByColor: Record<any, IWorldCell[]> = {};
    for (const cell of cells) {
      value = this.options.getData(this.worldMap, cell);
      index = Math.round(((value - min) / (max - min)) * 100);
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

    let x: number;
    let y: number;
    const cx = cells[0].x;
    const cy = cells[0].y;
    for (const [index, colorCells] of Object.entries(cellsByColor)) {
      color = colors[index];
      g.fillStyle = color;
      for (const cell of colorCells) {
        x = (cell.x - cx) * cellWidth;
        y = (cell.y - cy) * cellHeight;
        g.fillRect(x, y, cellWidth, cellHeight);
      }
    }
  }
}

export type MapModeDef = (worldMap: WorldMap, renderOptions: IWorldRendererOptions) => MapMode
export type MapModeMap = Partial<Record<EMapMode, MapModeDef>>;

export const mapModes: MapModeMap = {
  [EMapMode.CLIMATE]: (worldMap: WorldMap, renderOptions: IWorldRendererOptions) => (
    new GroupedCellsMapMode({
      title: 'Climate',
      groups: [
        {
          name: 'coastal',
          getCellColor: (cell: IWorldCell) => (
              cell.feature === ECellFeature.COASTAL ||
              cell.feature === ECellFeature.LAKE
            )
            ? climateColors.ocean.coast
            : null,
        },
        {
          name: 'rivers',
          getCellColor: (cell: IWorldCell) => cell.riverType > 0
            ? climateColors.ocean.coast
            : null,
        },
        {
          name: 'ocean',
          getCellColor: (cell: IWorldCell) => (
            cell.type === ECellType.OCEAN
              ? climateColors.ocean.deep
              : null
          )
        },
        ...Object.values(EBiome).map(biome => ({
          name: `biome-${biome}`,
          getCellColor: (cell: IWorldCell) => {
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
    worldMap, renderOptions)
  ),
  [EMapMode.FEATURES]: (worldMap: WorldMap, renderOptions: IWorldRendererOptions) => (
    new GroupedCellsMapMode({
      title: 'Features',
      showLegend: true,
      groups: mapEnum(ECellFeature).map(({ name, id }) => ({
        name: cellFeatureLabels[id],
        color: featureColors[id],
        getCellColor: (cell: IWorldCell) => (
          cell.feature === id
            ? featureColors[id]
            : null
        )
      })),
    }, worldMap, renderOptions)
  ),
  [EMapMode.TERRAIN]: (worldMap: WorldMap, renderOptions: IWorldRendererOptions) => (
    new GroupedCellsMapMode({
      title: 'Terrain',
      showLegend: true,
      groups: mapEnum(ETerrainType).map(({ name, id }) => ({
        name: terrainTypeLabels[id],
        color: terrainTypeColors[id],
        getCellColor: (cell: IWorldCell) => (
          cell.terrainType === id
            ? terrainTypeColors[id]
            : null
        )
      }))
    }, worldMap, renderOptions)
  ),
  [EMapMode.DRAINAGE_BASINS]: (worldMap: WorldMap, renderOptions: IWorldRendererOptions) => (
    new GroupedCellsMapMode({
      title: 'Drainage Basins',
      groups: [
        {
          name: `drainage-basins`,
          getCellColor: (cell: IWorldCell) => (
            cell.drainageBasin
              ? cell.drainageBasin.color
              : 0xFFF
          )
        }
      ]
    }, worldMap, renderOptions)
  ),
  [EMapMode.HEIGHT]: (worldMap: WorldMap, renderOptions: IWorldRendererOptions) => (
    new ColormapMapMode({
      title: 'Height',
      getData: (worldMap, cell) => cell.height,
      colormap: 'bathymetry',
    }, worldMap, renderOptions)
  ),
  [EMapMode.TEMPERATURE]: (worldMap: WorldMap, renderOptions: IWorldRendererOptions) => (
    new ColormapMapMode({
      title: 'Temperature',
      getData: (worldMap, cell) => cell.temperature,
      colormap: 'jet',
    }, worldMap, renderOptions)
  ),
  [EMapMode.MOISTURE]: (worldMap: WorldMap, renderOptions: IWorldRendererOptions) => (
    new ColormapMapMode({
      title: 'Moisture',
      getData: (worldMap, cell) => cell.moisture,
      colormap: 'viridis',
    }, worldMap, renderOptions)
  ),
  [EMapMode.UPSTREAM_COUNT]: (worldMap: WorldMap, renderOptions: IWorldRendererOptions) => (
    new ColormapMapMode({
      title: 'Upstream Count',
      getData: (worldMap, cell) => cell.upstreamCount,
      colormap: 'velocity-blue',
    }, worldMap, renderOptions)
  ),
  [EMapMode.MOISTURE_ZONES]: (worldMap: WorldMap, renderOptions: IWorldRendererOptions) => (
    new GroupedCellsMapMode({
      title: 'Moisture Zones',
      showLegend: true,
      groups: mapEnum(ETerrainType).map(({ name, id }) => ({
        name: moistureZoneTitles[id],
        color: moistureZoneColors[id],
        getCellColor: (cell: IWorldCell) => (
          cell.moistureZone === id
            ? moistureZoneColors[id]
            : null
        )
      }))
    }, worldMap, renderOptions)
  ),
  [EMapMode.TEMPERATURE_ZONES]: (worldMap: WorldMap, renderOptions: IWorldRendererOptions) => (
    new GroupedCellsMapMode({
      title: 'Temperature Zones',
      showLegend: true,
      groups: mapEnum(ETerrainType).map(({ name, id }) => ({
        name: temperatureZoneTitles[id],
        color: temperatureZoneColors[id],
        getCellColor: (cell: IWorldCell) => (
          cell.temperatureZone === id
            ? temperatureZoneColors[id]
            : null
        )
      }))
    }, worldMap, renderOptions)
  ),
  [EMapMode.TERRAIN_ROUGHNESS]: (worldMap: WorldMap, renderOptions: IWorldRendererOptions) => (
    new ColormapMapMode({
      title: 'Terrain Roughness',
      getData: (worldMap, cell) => cell.terrainRoughness,
      colormap: 'greens'
    }, worldMap, renderOptions)
  ),
}
