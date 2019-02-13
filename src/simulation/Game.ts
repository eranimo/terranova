import { meanBy } from 'lodash';
import { Point } from 'pixi.js';
import { ReplaySubject, Subject, BehaviorSubject } from 'rxjs';
import GameLoop from './GameLoop';
import World from './World';
import { IWorldCell, EBiome } from './worldTypes';
import { WorldRegion } from './WorldRegion';
import { worldStore } from './stores';
import GameCell, { Pop, EPopClass, IPopCoordinates, IGameCellView, IPopView, IGameMigration, carryingCapacities, timeFactor } from './GameCell';
import Array2D from '../utils/Array2D';
import { enumMembers } from "../utils/enums";
import { ObservableSet } from './ObservableSet';


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
  gameCells: ObservableSet<GameCell>;
  gameCell$: ReplaySubject<GameCell>;
  gameCellMap: Array2D<GameCell>;

  constructor(params: IGameParams, onError: (error: Error) => void) {
    super(onError);
    this.gameData = params.gameData || Object.assign({}, initialGameData);
    this.params = params;
    this.world = null;
    this.gameCell$ = new ReplaySubject();
    this.gameCell$.subscribe(gameCell => this.gameCells.add(gameCell));
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

    setTimeout(() => {
      const region = new WorldRegion({
        cells: [
          this.world.getCell(181, 135),
          this.world.getCell(182, 135),
        ],
        name: 'Cappa',
        color: 0x00FFFF,
      });
      console.log('GAME: add region Cappa')
      this.world.regions.add(region);
      this.newRegion$.next(region);
    }, 7000);

    // this.addTimer({
    //   ticksLength: 30,
    //   isRepeated: true,
    //   onTick: (ticksElapsed: number) => console.log('ticks', ticksElapsed),
    //   onFinished: () => console.log('timer done!'),
    // });

    this.gameCells = new ObservableSet();
    this.gameCellMap = new Array2D(this.world.size.width, this.world.size.height);

    for (let x = 0; x < this.world.size.width; x++) {
      for (let y = 0; y < this.world.size.height; y++) {
        const gc = this.populateCell(x, y);
        gc.addPop(EPopClass.FORAGER, Math.floor(carryingCapacities[gc.worldCell.biome]));
      }
    }

    // const gc1 = this.populateCell(12, 12);
    // gc1.addPop(EPopClass.FORAGER, 100);

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
    const numTicks = Math.floor(360/timeFactor);
    this.addTimer({
      ticksLength: 30,
      isRepeated: true,
      onTick: null,
      onFinished: () =>  this.updatePops(),
    });
  }

  populateCell(x: number, y: number): GameCell {
    console.log()
    const gameCell = new GameCell(this.world.getCell(x, y));
    this.gameCells.add(gameCell);
    this.gameCellMap.set(x, y, gameCell);
    return gameCell;
  }

  update(elapsedTime: number) {
    super.update(elapsedTime);
  }

  updatePops() {
    let totalPop = 0;
    let popByClass: Record<EPopClass, number> = {
      [EPopClass.FORAGER]: 0,
      [EPopClass.FARMER]: 0,
      [EPopClass.ARTISAN]: 0,
      [EPopClass.PRIEST]: 0
    }
    const migrationsMap: Map<EPopClass, Array<IGameMigration>> = new Map();
    for (const popType of enumMembers(EPopClass)) {
      migrationsMap.set(popType, new Array());
    }
    for (const gameCell of this.gameCells) {
      if(!(gameCell.worldCell.biome == EBiome.NONE)) {
        const migrationView = gameCell.update();
        migrationsMap.get(migrationView[0].socialClass).push(migrationView[0]);
        migrationsMap.get(migrationView[1].socialClass).push(migrationView[1]);
        for (const popType of enumMembers(EPopClass)) {
          const cellPop = Math.floor(gameCell.getSocialPopulation(popType));
          popByClass[popType] += cellPop;
          totalPop += cellPop;
        }
      }
    }
    let totalMigrants = 0
    for (const migrationClass of migrationsMap.keys()) {
      // console.log(migrationClass);
      let migrations = migrationsMap.get(migrationClass);
      if(migrations.length < 1)
      {
        continue;
      }
      migrations.sort((a, b) => a.populationPressure - b.populationPressure);
      while (
        migrations.length > 1 &&
        migrations[migrations.length - 1].populationPressure - migrations[0].populationPressure > migrations[migrations.length - 1].populationPressure / 2
      ) {
        let migrationSource = migrations[0];
        let gameCellSource: GameCell = this.gameCellMap.get(migrationSource.x, migrationSource.y);
        const migrationDest = migrations[migrations.length - 1];
        const gameCellDest: GameCell = this.gameCellMap.get(migrationDest.x, migrationDest.y);
        const destPop: Pop = this.gameCellMap.get(migrationDest.x, migrationDest.y).getNextPop(migrationClass);
        // console.log(migrationDest, migrationSource);
        while(gameCellSource.getSocialPopulation(migrationClass) > 0 && migrationDest.populationPressure > 0) {
          // console.log(migrationDest.populationPressure);
          let newMigrants = gameCellSource.getNextPop(migrationClass).emigrate(migrationDest.populationPressure, destPop);
          migrationDest.populationPressure -= newMigrants;
          totalMigrants += newMigrants;
        }
        migrations = migrations.slice(1, migrations.length - 1);
        if(migrationDest.populationPressure <= 0) {
          migrations = migrations.slice(0, migrations.length - 2);
        }
      }
    }
    console.log(popByClass);
    console.log(totalMigrants);
    console.log(totalPop);
  }
}
