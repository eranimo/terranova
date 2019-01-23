import { EMapMode, mapModes, MapModeMap, IMapMode, rgbToNumber } from '../worldview/mapModes';
import { IWorldRendererOptions } from '../worldview/WorldRenderer';
import { IWorldCell } from '../../simulation/worldTypes';
import { Sprite, Graphics, Point, Container, Text, TextStyle } from 'pixi.js';
import { WorldMap } from '../../common/WorldMap';
import colormap from 'colormap';

const getPopulationOfCell = (cell: IWorldCell, worldMap: WorldMap) => {
  const coordinates: string = `${cell.x}, ${cell.y}`;
  if(worldMap.popMap.get(coordinates).length > 0) {
    console.log('hi');
  }
  return (worldMap.popMap.get(coordinates) || []).reduce((prev, next) => (prev + next.population), 0);
}

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
class PopulationMapMode implements IMapMode {
  title: string;
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
      colormap: string,
      showLegend?: boolean,
    },
    worldMap: WorldMap
  ) {
    this.title = options.title;
    this.worldMap = worldMap;
    this.colormap = options.colormap;
    this.showLegend = options.showLegend !== false;
    this.resetColorData();
  }

  resetColorData() {

    const colors: [number, number, number, number][] = colormap({
      nshades: 101,
      format: 'rba',
      colormap: this.colormap
    });
    let item;
    let min = Infinity;
    let max = -Infinity;
    const data = [];
    for (const population of this.worldMap.popMap.values()) {
      item = population.reduce((prev, next) => (prev + next.population), 0);
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
    this.resetColorData()
    const { min, max, colors } = this.mapData;
    const index = Math.round(((getPopulationOfCell(cell, this.worldMap) - min) / (max - min)) * 100);
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
      index = Math.round(((getPopulationOfCell(cell, this.worldMap) - min) / (max - min)) * 100);
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

export const gameMapModes: MapModeMap = {
  ...mapModes,
  [EMapMode.POLITICAL]: (worldMap: WorldMap) => (
    new RegionMapMode({
      title: 'Political Map',
    }, worldMap)
  ),
  [EMapMode.POPULATION]: (worldMap: WorldMap) => (
    new PopulationMapMode({
      title: 'Population',
      colormap: 'bathymetry'
    }, worldMap)
}
