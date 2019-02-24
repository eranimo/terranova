# ECS Design

## Entities
- collections of components
- represented as integer IDs
- entities can have several of the same components

## Components
- JSON-serializable data object
- special data type: component reference

## Systems
- functions that operate over a set of components
  - can run in a specified tick interval

## Manager
- runs systems
- contains components
- contains mapping of components to entities

# Implementation
Components as ObservableDict
Systems are observables merged from the grouped components

# Example

Entities:
- GameCells can have many Pops
- GameCells can have many Buildings
- GameCells have a housing number
- GameCells have a food number
- GameCells have a carring capacity number
- Pops have a Social Class
- Buildings have a BuildingType


## Components
- HasPopulation
  - value: number
  - class: EPopClass
- HasPops
  - Array<HasPopulation>
- HasBuildings
  - Map<Building, number>
## Systems
- PopSystem
  - updates population
- BuildingSystem
  - updated buildings
- PopulationMapMode
  - updates population map mode SAB
