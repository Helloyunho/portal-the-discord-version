import { Position } from './other.ts'

export enum PropTypes {
  NONE = 0,
  WALL = 1,
  NON_PORTALABLE_WALL = 2,
  ORANGE_PORTAL = 3,
  BLUE_PORTAL = 4,
  CUBE_BUTTON = 5,
  ACTIVATED_CUBE_BUTTON = 6,
  BUTTON = 7,
  ACTIVATED_BUTTON = 8,
  CUBE = 9,
  CLEAR_FIELD = 10,
  PLAYER = 11,
  PLAYER_WITH_BLUE_PORTALGUN = 12,
  PLAYER_WITH_ORANGE_PORTALGUN = 13,
  PLAYER_WITH_BOTH_PORTALGUN = 14,
  CLOSED_DOOR = 15,
  OPENED_DOOR = 16,
  GOO = 17,
  PLAYER_HOLDING_A_CUBE = 18
}

export interface Portals {
  blue: Position | null
  orange: Position | null
}

export interface Button {
  type: 'button'
  activate: Position | null
  activated: boolean
  position: Position
  timer?: number
  cube: boolean
}

export interface Door {
  type: 'door'
  activated: boolean
  position: Position
}

export interface CubeDropper {
  type: 'cubedropper'
  activated: boolean
  position: Position
}

export const UsableProps = [
  PropTypes.CUBE,
  PropTypes.BUTTON,
  PropTypes.ACTIVATED_CUBE_BUTTON
]
export const DropableProps = [PropTypes.CUBE_BUTTON, PropTypes.NONE]
