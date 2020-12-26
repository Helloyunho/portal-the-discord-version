import { Position } from './other.ts'
import { Player } from './player.ts'
import { Button, CubeDropper, Door, Portals, PropTypes } from './props.ts'

export interface World {
  field: PropTypes[][]
  size: WorldSize
}
export interface WorldSize {
  width: number
  height: number
}

export interface WorldGenerator {
  world: World
  props: Array<Door | Button | CubeDropper>
  portals: Portals
  playerPosition: Position
}

export interface WorldData {
  id: number
  world: World
  props: Array<Door | Button | CubeDropper>
  portals: Portals
  player: Player
}
