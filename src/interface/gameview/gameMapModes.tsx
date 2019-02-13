import { WorldMap } from '../../common/WorldMap';
import { EMapMode, MapModeMap, mapModes, ColormapMapMode } from '../worldview/mapModes';


export const gameMapModes: MapModeMap = {
  ...mapModes,
  [EMapMode.POPULATION]: (worldMap: WorldMap) => (
    new ColormapMapMode({
      title: 'Political Map',
      getData: (worldMap, cell) => worldMap.populationMap.get(cell.x, cell.y),
      colormap: 'picnic',
      update$: () => worldMap.populationMapUpdate$
    }, worldMap)
  )
}
