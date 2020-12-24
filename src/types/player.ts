import { PortalgunStates } from './other.ts'

export interface PlayerPosition {
  x: number
  y: number
}

export enum Directions {
  UP = 0,
  DOWN = 1,
  LEFT = 2,
  RIGHT = 3
}

export interface Player {
  position: PlayerPosition
  portalgun: PortalgunStates
}
