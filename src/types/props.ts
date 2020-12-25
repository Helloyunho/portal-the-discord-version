import { Position } from './other.ts'

export interface Portals {
  blue: Position | null
  orange: Position | null
}

export interface Button {
  activate: Position
  activated: boolean
}

export interface Door {
  activated: boolean
}
