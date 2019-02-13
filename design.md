# Architecture
## Classes
- Game
  - has a World
  - has 2D map of Regions
- World
- WorldCell: one cell in the world map
- Region
  - has 2D map of Cells
- RegionCell: one cell in the region

## File Structure
- simulation/
  - world/
    - worldFactory
  - game/
- interface
  - common/
    -
  - *module-name*/
    - components/
    - index.tsx
    - ModuleName.tsx

## Processes
- Main thread: communicates between threads, renders UI
- Game thread: runs simulation
- World thread: handles pathfinding requests
- Generator thread:
- world generator
- region generator


# World Editor

- 3 Steps, each with 2 columns
  Left: form showing config for this step
  Right: PixiJS Viewport showing map
    - option for viewing in full screen modal
- Generating one step throws away all previous steps
- Each step depends on the previous steps

Steps and config:
  1) Terrain
    - width & height
    - world shape
    - roughness (dropdown)
    - world shape power (0 to 5)
  2) Temperature
    - temperature range
    - elevation cooling amount
  3) Water
    - sealevel (0 to 255)
    - moistureModifier (0 to 1)
    - depressionFillPercent (0 to 1)
    - riverThreshold (0 to 1) (0 to 1)
  4) Biomes
    -

# World generator TODO
- monthly temperatures for each cell
  - using insolation formula?
- wrap edges of map
- simulating rainfall (depressions being lakes?)
- 3D map viewer?


# Climate simulation
- Planet model:
  - mass
  - diameter
  - axial tilt
- Steps:
  - For each cell:
    - calculate insolation (input), and radiance (output)
    - calculate temperature
    - spread temperature to neighboring cells



# UI
- New Game
  1. World Generator

  UI:
    - top left:
      - dropdown menu:
        - save map (open modal)
        - load map (open modal)
        - exit
      - world config dropdown
      - regenerate button
      - randomize button
    - left sidebar (33% width)
      - world config
      - bottom:
        - start game button (primary)
    - bottom right:
      - map mode menu
      - minimap
      - view controls:
        - grid
        - debug layer
        - coastline border
        - regions
  2. Game Generator: edit game starting conditions
- Game
  - load map
  - load game
  - start game worker

  UI:
    - full page card

- Load Game: list of saved games
- Options
