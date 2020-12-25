import { PortalgunStates } from './other.ts'
import { Position } from './other.ts'

export enum Directions {
  UP = 0,
  DOWN = 1,
  LEFT = 2,
  RIGHT = 3
}

export interface Player {
  position: Position
  portalgun: PortalgunStates
}
