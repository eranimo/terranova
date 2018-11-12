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
