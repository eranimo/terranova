# ECS Design
## Goal
- Separation of logic from data
- Serialize and deserialize game state for saving and loading
- Easily transfer data between threads

## Overview
- Entities are just data. Keys are string and values are numbers.
- Entities have relationships to other Entities
- Systems iterate over Entities

### Entities
- type
- data
- relationships

### Relationships
- from entity
- to entity
- data
- name

### Systems
- functions that operate over a set of components
  - can run in a specified tick interval

### Services
- classes available to each entity
- initialized at start

### Manager
- runs systems
- contains components
- contains mapping of components to entities

## Implementation
- each entity stores its data in a SharedArrayBuffer-backed ObservableDict
  - this means we have a max number of entities in the system

- Render thread reads, Game thread writes
- event system for handling UI updates
  - add-entity: (type, id)
  - update-entity: (type, id) - when entity fields update
  - remove-entity: (type, id)

## Example

Entities:
- GameCells can have many Pops
- GameCells can have many Buildings
- GameCells have a housing number
- GameCells have a food number
- GameCells have a carring capacity number
- Pops have a Social Class
- Buildings have a BuildingType


## Entities
- Pop
  - data:
    - value: number
    - class: EPopClass
- GameCell
  - data:
    - location: WorldCell
  - Relationship<Pop>
  - Map<BuildingType, number>
## Systems
- PopSystem
  - updates population
- BuildingSystem
  - updated buildings
- PopulationMapMode
  - updates population map mode SAB
