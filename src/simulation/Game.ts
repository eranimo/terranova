import { RegionGenerator } from './worldgen/RegionGenerator';
import { worldStore } from './index';
import World from "./World";
import Array2D from '../utils/Array2D';
import Region from './Region';


export interface IGameData {
  entities: any[];
}

export interface IGameParams {
  worldSaveName: string;
  name: string;
  gameData?: IGameData
}

const initialGameData: IGameData = {
  entities: [],
};

export default class Game {
  name: string;
  world: World | null;
  regions: Array2D<Region>;
  gameData: IGameData;
  params: IGameParams;
  regionGenerator: RegionGenerator;

  constructor(params: IGameParams) {
    this.name = params.name;
    this.gameData = params.gameData || Object.assign({}, initialGameData);
    this.params = params;
    this.world = null;
  }

  async init() {
    this.world = await worldStore.load(this.params.worldSaveName);
    const scale = 10;
    const regionSize = { width: 10, height: 10 };
    // number of regions along the X,Y axis
    const regionX = this.world.size.width / regionSize.width;
    const regionY = this.world.size.height / regionSize.height;
    this.regions = new Array2D(regionX, regionY);
    const worldLocalWidth = this.world.size.width * scale;
    const worldLocalHeight = this.world.size.height * scale;
    console.log('worldLocalWidth', worldLocalWidth);
    console.log('worldLocalHeight', worldLocalHeight);

    this.regionGenerator = new RegionGenerator(this.world, {
      scale,
      regionSize,
    });

    const promises = []
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        promises.push(this.regionGenerator.generateRegion(x, y));
      }
    }
    Promise.all(promises)
      .then(regions => {
        console.log(regions);
      });
  }
}
