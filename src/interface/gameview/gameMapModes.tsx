import { WorldMap } from '../../common/WorldMap';
import { EMapMode, MapModeMap, mapModes, ColormapMapMode } from '../worldview/mapModes';
import { IWorldRendererOptions } from '../worldview/WorldRenderer';


export const gameMapModes: MapModeMap = {
  ...mapModes,
  [EMapMode.POPULATION]: (worldMap: WorldMap, renderOptions: IWorldRendererOptions) => (
    new ColormapMapMode({
      title: 'Population Map',
      getData: (worldMap, cell) => worldMap.populationMap.get(cell.x, cell.y),
      colormap: 'picnic',
      update$: () => worldMap.populationMapUpdate$
    }, worldMap, renderOptions)
  )
}
