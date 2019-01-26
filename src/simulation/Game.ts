import { meanBy } from 'lodash';
import { Point } from 'pixi.js';
import { ReplaySubject, Subject } from 'rxjs';
import GameLoop from './GameLoop';
import World from './World';
import { IWorldCell, EBiome } from './worldTypes';
import { WorldRegion } from './WorldRegion';
import { worldStore } from './stores';
import GameCell, { Pop, EPopClass, IPopCoordinates, IGameCellView, IPopView, IGameMigration, carryingCapacities } from './GameCell';
import Array2D from '../utils/Array2D';
import { enumMembers } from "../utils/enums";


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

export default class Game extends GameLoop {
  world: World | null;
  gameData: IGameData;
  params: IGameParams;
  newRegion$: ReplaySubject<WorldRegion>;
  gameCells: Set<GameCell>;
  gameCell$: ReplaySubject<IGameCellView>;
  gameCellMap: Array2D<GameCell>;
  newPop$: ReplaySubject<IPopCoordinates>;

  constructor(params: IGameParams) {
    super();
    this.gameData = params.gameData || Object.assign({}, initialGameData);
    this.params = params;
    this.world = null;
    this.newPop$ = new ReplaySubject();
    this.gameCell$ = new ReplaySubject();
  }

  async init() {
    // start playing:
    // this.start();

    // initialize world
    this.world = await worldStore.load(this.params.worldSaveName);

    this.newRegion$ = new ReplaySubject();

    // create regions
    // const cells = [
    //   this.world.getCell(79, 135),
    //   this.world.getCell(79, 134),
    //   this.world.getCell(80, 135),
    //   this.world.getCell(80, 134),
    //   this.world.getCell(81, 135),
    //   this.world.getCell(81, 134),
    // ];
    // console.log('cells', cells);
    // const region1 = new WorldRegion({
    //   cells,
    //   name: 'Alpha',
    //   color: 0xFF0000,
    // });
    // const region2 = new WorldRegion({
    //   cells: [
    //     this.world.getCell(81, 135),
    //     this.world.getCell(82, 135),
    //     this.world.getCell(83, 135),
    //     this.world.getCell(83, 136),
    //     this.world.getCell(84, 136),
    //     this.world.getCell(84, 135),
    //   ],
    //   name: 'Beta',
    //   color: 0x0000FF,
    // })
    // this.world.regions.add(region1);
    // this.newRegion$.next(region1);

    // setTimeout(() => {
    //   this.world.regions.add(region2);
    //   this.newRegion$.next(region2);
    // }, 4000);

    // setTimeout(() => {
    //   region2.cells$.add(this.world.getCell(85, 136));
    //   this.newRegion$.next(region2);
    // }, 6000);

    // this.addTimer({
    //   ticksLength: 30,
    //   isRepeated: true,
    //   onTick: (ticksElapsed: number) => console.log('ticks', ticksElapsed),
    //   onFinished: () => console.log('timer done!'),
    // });

    this.gameCells = new Set();
    this.gameCellMap = new Array2D(this.world.size.width, this.world.size.height);

    for (let x = 0; x < this.world.size.width; x++) {
      for (let y = 0; y < this.world.size.height; y++) {
        const gc = this.populateCell(x, y);
        gc.addPop(EPopClass.FORAGER, Math.floor(carryingCapacities[gc.worldCell.biome]));
      }
    }

    // const gc1 = this.populateCell(81, 135);
    // gc1.addPop(EPopClass.FORAGER, 1000);

    // setTimeout(() => {
    //   region2.cells$.add(this.world.getCell(85, 136));
    //   this.newRegion$.next(region2);
    // }, 6000);
    // perf test
    // for (let x = 0; x < 10; x++) {
    //   for (let y = 0; y < 10; y++) {
    //     const gc1 = this.populateCell(x, y);
    //     gc1.addPop(new Pop(EPopClass.FORAGER, 1000));
    //     gc1.addPop(new Pop(EPopClass.FARMER, 10000));
    //     gc1.addPop(new Pop(EPopClass.NOBLE, 50));
    //   }
    // }
  }

  populateCell(x: number, y: number): GameCell {
    console.log()
    const gameCell = new GameCell(this.world.getCell(x, y));
    const popSet = new Set<IPopView>();
    gameCell.newPop$.subscribe((pop) => {
      const popView = {
        population: pop.totalPopulation,
        socialClass: pop.class,
      };
      pop.popGrowth$.subscribe((population) => {
        popView.population = population;
      });
      popSet.add(popView);
    });
    this.gameCells.add(gameCell);
    this.gameCell$.next({
      pops: popSet,
      buildingByType: gameCell.buildingByType,
      xCoord: x,
      yCoord: y
    });
    this.gameCellMap.set(x, y, gameCell);

    return gameCell;
  }

  update(elapsedTime: number) {
    super.update(elapsedTime);
    if (this.state.dayCount.getValue() % 30 == 0) {
      let totalPop = 0;
      const migrationsMap: Map<EPopClass, Array<IGameMigration>> = new Map();
      for (const popType of enumMembers(EPopClass)) {
        migrationsMap.set(popType, new Array());
      }
      for (const gameCell of this.gameCells) {
        if(!(gameCell.worldCell.biome == EBiome.NONE)) {
          const migrationView = gameCell.update();
          migrationsMap.get(migrationView[0].socialClass).push(migrationView[0]);
          migrationsMap.get(migrationView[1].socialClass).push(migrationView[1]);
          // console.log(`${gameCell.worldCell.x}, ${gameCell.worldCell.y}, ${gameCell.getTotalPopulation()}`);
          totalPop += gameCell.getTotalPopulation();
        }
      }
      for (const migrationClass of migrationsMap.keys()) {
        // console.log(migrationClass);
        let migrations = migrationsMap.get(migrationClass);
        if(migrations.length < 1)
        {
          continue;
        }
        while (
          migrations.length > 1 &&
          migrations[migrations.length - 1].populationPressure - migrations[0].populationPressure > migrations[migrations.length - 1].populationPressure / 2
        ) {
          migrations.sort((a, b) => a.populationPressure - b.populationPressure);
          let migrationSource = migrations[0];
          let gameCellSource: GameCell = this.gameCellMap.get(migrationSource.x, migrationSource.y);
          const migrationDest = migrations[migrations.length - 1];
          const gameCellDest: GameCell = this.gameCellMap.get(migrationDest.x, migrationDest.y);
          const destPop: Pop = this.gameCellMap.get(migrationDest.x, migrationDest.y).getNextPop(migrationClass);
          // console.log(migrationDest, migrationSource);
          while(gameCellSource.getSocialPopulation(migrationClass) > 0) {
            console.l
            migrationSource.populationPressure -= gameCellSource.getNextPop(migrationClass).emigrate(migrationDest.populationPressure, destPop);
          }
          migrations = migrations.slice(1, migrations.length - 1);
        }
      }
      console.log(totalPop);
    }
  }
}
