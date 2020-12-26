import { PropTypes } from './props.ts'

export const GoThroughableBlocks = [
  PropTypes.BLUE_PORTAL,
  PropTypes.ORANGE_PORTAL,
  PropTypes.NONE,
  PropTypes.CLEAR_FIELD,
  PropTypes.OPENED_DOOR,
  PropTypes.GOO,
  PropTypes.GOAL
]

export enum PortalgunStates {
  NONE = 0,
  BLUE_ONLY = 1,
  ORANGE_ONLY = 2,
  ALL = 3
}

export interface Position {
  x: number
  y: number
}

export const MovementEmojis = ['⬆', '⬇', '⬅', '➡']
export const PortalEmojis = ['🔵', '🟠']
export const BluePortalEmoji = '🔵'
export const OrangePortalEmoji = '🟠'
