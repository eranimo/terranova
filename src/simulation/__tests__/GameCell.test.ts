import GameCell, { Pop, EPopClass, EBuildingType, EGoods } from "../GameCell";
import { IWorldCell, ECellType, ERiverType, ETerrainType, ECellFeature, EDirection, IDrainageBasin, EMoistureZone, ETemperatureZone, EBiome } from "../worldTypes";
import { enumMembers } from "../../utils/enums";
describe('Pop', () => {
	it('Pop doesn\'t grow', () => {
		const testPop = new Pop(EPopClass.FARMER, 100);
		testPop.update(100);
		expect(testPop.population).toEqual(100);
	});
	it('Pop grows', () => {
		const testPop = new Pop(EPopClass.FARMER, 100);
		testPop.update(200);
		expect(testPop.population).toEqual(101);
	});
	it('Pop collapse', () => {
		const testPop = new Pop(EPopClass.FARMER, 200);
		testPop.update(100);
		expect(testPop.population).toEqual(100);
	});
	it('Nobles Created', () => {
		const testPopFarmer = new Pop(EPopClass.FARMER, 100);
		const testPopNoble = new Pop(EPopClass.PRIEST, 0);
		testPopFarmer.emigrate(10, testPopNoble);
		expect(testPopFarmer.population).toEqual(90);
        expect(testPopNoble.population).toEqual(10);
	});
});
describe('GameCell', () => {
    let testWorldCell: IWorldCell;

    beforeEach(() => {
        testWorldCell = {
          x: 1,
          y: 1,
          height: 1,
          type: ECellType.LAND,
          riverType: ERiverType.NONE,
          terrainType: ETerrainType.PLAIN,
          feature: ECellFeature.LAND,
          flowDir: EDirection.NONE,
          temperature: 0,
          upstreamCount: 0,
          moisture: 0,
          moistureZone: EMoistureZone.WET,
          temperatureZone: ETemperatureZone.TEMPERATE,
          biome: EBiome.TEMPERATE_FOREST,
          terrainRoughness: 0,
        };
    });
    it('GameCell Promote to Farmer', () => {
        const testGameCell = new GameCell(testWorldCell);
        testGameCell.addPop(EPopClass.FORAGER, testGameCell.carryingCapacity);
        for(let i = 0; i < 5; i++) {
            testGameCell.update();
        }
        expect(testGameCell.popsByClass.get(EPopClass.FARMER).size).toEqual(1);
        expect(testGameCell.populationSize).toBeGreaterThan(1000);
        expect(testGameCell.getSocialPopulation(EPopClass.FARMER)).toBeGreaterThan(100);
        expect(testGameCell.buildingByType[EBuildingType.FARM]).toBeGreaterThan(200);
        expect(testGameCell.buildingByType[EBuildingType.WORKSHOP]).toBeGreaterThan(2);
    });
    it('GameCell Promote to ARTISAN', () => {
        const testGameCell = new GameCell(testWorldCell);
        testGameCell.addPop(EPopClass.FORAGER, testGameCell.carryingCapacity);
        for(let i = 0; i < 30; i++) {
            testGameCell.update();
        }
        expect(testGameCell.popsByClass.get(EPopClass.ARTISAN).size).toEqual(1);
        expect(testGameCell.populationSize).toBeGreaterThan(1000);
        expect(testGameCell.getSocialPopulation(EPopClass.FARMER)).toBeGreaterThan(1000);
        expect(testGameCell.buildingByType[EBuildingType.FARM]).toBeGreaterThan(1000);
        expect(testGameCell.getSocialPopulation(EPopClass.ARTISAN)).toBeGreaterThan(10);
        expect(testGameCell.buildingByType[EBuildingType.WORKSHOP]).toBeGreaterThan(10);
        expect(testGameCell.goodsStockPile[EGoods.FARM_TOOLS_1]).toBeGreaterThan(10)
    });
    it('GameCell Population to Fall', () => {
        const testGameCell = new GameCell(testWorldCell);
        testGameCell.addPop(EPopClass.FARMER, testGameCell.carryingCapacity);
        testGameCell.update();
        expect(testGameCell.popsByClass.get(EPopClass.ARTISAN).size).toEqual(1);
        expect(testGameCell.populationSize).toBeLessThan(1000);
        expect(testGameCell.buildingByType[EBuildingType.FARM]).toBeGreaterThan(500);
        expect(testGameCell.buildingByType[EBuildingType.WORKSHOP]).toBeGreaterThan(2);
    });
});