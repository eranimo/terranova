# Architecture
## Classes
- Game
- World
- Region

## File Structure
- simulation/
  - generators/
    - worldgen/
    - regiongen/
  - Game.tsx
  - World.tsx
  - Region.tsx
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
