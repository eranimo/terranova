import GameCell, { Pop, EPopClass } from "../GameCell";

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
		const testPopNoble = new Pop(EPopClass.NOBLE, 0);
		testPopFarmer.emigrate(10, testPopNoble);
		expect(testPopFarmer.population).toEqual(90);
        expect(testPopNoble.population).toEqual(10);
	});
})