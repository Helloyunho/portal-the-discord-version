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
  OPENED_DOOR = 16
}

export const GoThroughableBlocks = [
  PropTypes.BLUE_PORTAL,
  PropTypes.ORANGE_PORTAL,
  PropTypes.NONE,
  PropTypes.CLEAR_FIELD,
  PropTypes.OPENED_DOOR
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
