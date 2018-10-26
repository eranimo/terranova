import { EBiome, ETemperatureZone, ETerrainType, ECellFeature, EMoistureZone, EDirection } from './worldTypes';


export const biomeTitles = {
  [EBiome.NONE]: 'None',
  [EBiome.GLACIAL]: 'Glacial',
  [EBiome.TUNDRA]: 'Tundra',
  [EBiome.BOREAL_FOREST]: 'Boreal Forest',
  [EBiome.SHRUBLAND]: 'Scrubland',
  [EBiome.WOODLAND]: 'Woodland',
  [EBiome.GRASSLAND]: 'Grassland',
  [EBiome.SAVANNA]: 'Savanna',
  [EBiome.DESERT]: 'Desert',
  [EBiome.TEMPERATE_FOREST]: 'Temperate Forest',
  [EBiome.TEMPERATE_RAINFOREST]: 'Temperate Rainforest',
  [EBiome.TROPICAL_FOREST]: 'Tropical Forest',
  [EBiome.TROPICAL_RAINFOREST]: 'Tropical Rainforest'
};

export const temperatureZoneTitles = {
  [ETemperatureZone.ARCTIC]: 'Arctic',
  [ETemperatureZone.SUBARCTIC]: 'Subarctic',
  [ETemperatureZone.TEMPERATE]: 'Temperate',
  [ETemperatureZone.SUBTROPICAL]: 'Subtropical',
  [ETemperatureZone.TROPICAL]: 'Tropical',
};

export const terrainTypeLabels = {
  [ETerrainType.NONE]: 'None',
  [ETerrainType.PLAIN]: 'Plain',
  [ETerrainType.FOOTHILLS]: 'Foothills',
  [ETerrainType.PLATEAU]: 'Plateau',
  [ETerrainType.HIGHLANDS]: 'Highlands',
};

export const cellFeatureLabels = {
  [ECellFeature.COASTAL]: 'Coastal',
  [ECellFeature.SHELF]: 'Shelf',
  [ECellFeature.OCEANIC]: 'Oceanic',
  [ECellFeature.LAND]: 'Land',
  [ECellFeature.LAKE]: 'Lake',
};

export const moistureZoneTitles = {
  [EMoistureZone.BARREN]: 'Barren',
  [EMoistureZone.ARID]: 'Arid',
  [EMoistureZone.SEMIARID]: 'Semiarid',
  [EMoistureZone.SEMIWET]: 'Semiwet',
  [EMoistureZone.WET]: 'Wet',
};

export const directionLabels = {
  [EDirection.NONE]: 'None',
  [EDirection.UP]: 'Up',
  [EDirection.DOWN]: 'Down',
  [EDirection.LEFT]: 'Left',
  [EDirection.RIGHT]: 'Right',
};
