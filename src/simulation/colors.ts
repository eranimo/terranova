import { EBiome, ETerrainType } from './worldTypes';


export const biomeLabelColors = {
  [EBiome.NONE]: 0x4783A0,
  [EBiome.GLACIAL]: 0xFFFFFF,
  [EBiome.TUNDRA]: 0x96D1C3,
  [EBiome.BOREAL_FOREST]: 0x006259,
  [EBiome.SHRUBLAND]: 0xB26A47,
  [EBiome.WOODLAND]: 0xB26A47,
  [EBiome.GRASSLAND]: 0xF6EB64,
  [EBiome.SAVANNA]: 0xC7C349,
  [EBiome.DESERT]: 0x8B4D32,
  [EBiome.TEMPERATE_FOREST]: 0x92D847,
  [EBiome.TEMPERATE_RAINFOREST]: 0x6B842A,
  [EBiome.TROPICAL_FOREST]: 0x097309,
  [EBiome.TROPICAL_RAINFOREST]: 0x005100
};

export const climateColors = {
  ocean: {
    deep: 0x3A52BB,
    coast: 0x4E6AE6
  },
  biomes: {
    [EBiome.NONE]: 0x000000,
    [EBiome.GLACIAL]: 0xFFFFFF,
    [EBiome.TUNDRA]: {
      [ETerrainType.PLAIN]: 0x6e7c59,
      [ETerrainType.FOOTHILLS]: 0x75805B,
      [ETerrainType.PLATEAU]: 0x75805B,
      [ETerrainType.HIGHLANDS]: 0x75805B
    },
    [EBiome.BOREAL_FOREST]: {
      [ETerrainType.PLAIN]: 0x42562F,
      [ETerrainType.FOOTHILLS]: 0x4d5b40,
      [ETerrainType.PLATEAU]: 0x42562F,
      [ETerrainType.HIGHLANDS]: 0x3f513a
    },
    [EBiome.SHRUBLAND]: {
      [ETerrainType.PLAIN]: 0xD7CC9E,
      [ETerrainType.FOOTHILLS]: 0xd3c9a0,
      [ETerrainType.PLATEAU]: 0xD7CC9E,
      [ETerrainType.HIGHLANDS]: 0xc9c09b
    },
    [EBiome.WOODLAND]: {
      [ETerrainType.PLAIN]: 0x9fb277,
      [ETerrainType.FOOTHILLS]: 0x92a075,
      [ETerrainType.PLATEAU]: 0x92a36e,
      [ETerrainType.HIGHLANDS]: 0x9ca883
    },
    [EBiome.GRASSLAND]: {
      [ETerrainType.PLAIN]: 0x9fb981,
      [ETerrainType.FOOTHILLS]: 0xADB981,
      [ETerrainType.PLATEAU]: 0x9fb981,
      [ETerrainType.HIGHLANDS]: 0xa3ad8a
    },
    [EBiome.SAVANNA]: {
      [ETerrainType.PLAIN]: 0xC9CD7C,
      [ETerrainType.FOOTHILLS]: 0xcbce8a,
      [ETerrainType.PLATEAU]: 0xC9CD7C,
      [ETerrainType.HIGHLANDS]: 0xbabc84
    },
    [EBiome.DESERT]: {
      [ETerrainType.PLAIN]: 0xD9BF8C,
      [ETerrainType.FOOTHILLS]: 0xC4AC80,
      [ETerrainType.PLATEAU]: 0xB39B73,
      [ETerrainType.HIGHLANDS]: 0x917d5d
    },
    [EBiome.TEMPERATE_FOREST]: {
      [ETerrainType.PLAIN]: 0x4d703a,
      [ETerrainType.FOOTHILLS]: 0x5d704c,
      [ETerrainType.PLATEAU]: 0x626E49,
      [ETerrainType.HIGHLANDS]: 0x5c6641
    },
    [EBiome.TEMPERATE_RAINFOREST]: {
      [ETerrainType.PLAIN]: 0x425D27,
      [ETerrainType.FOOTHILLS]: 0x405927,
      [ETerrainType.PLATEAU]: 0x405927,
      [ETerrainType.HIGHLANDS]: 0x49593a
    },
    [EBiome.TROPICAL_FOREST]: {
      [ETerrainType.PLAIN]: 0x4d703a,
      [ETerrainType.FOOTHILLS]: 0x5d704c,
      [ETerrainType.PLATEAU]: 0x626E49,
      [ETerrainType.HIGHLANDS]: 0x5c6641
    },
    [EBiome.TROPICAL_RAINFOREST]: {
      [ETerrainType.PLAIN]: 0x426D18,
      [ETerrainType.FOOTHILLS]: 0x426D18,
      [ETerrainType.PLATEAU]: 0x3d6616,
      [ETerrainType.HIGHLANDS]: 0x3d6616
    }
  }
};
