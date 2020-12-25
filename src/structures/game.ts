import { Directions, Player } from '../types/player.ts'
import { World } from '../types/world.ts'
import { PropTypes, GoThroughableBlocks } from '../types/other.ts'
import { Button, Door, Portals } from '../types/props.ts'

const PropToEmoji = [
  '⬛',
  '⬜️',
  '🟫',
  '🟠',
  '🔵',
  '🟥',
  '🟩',
  '🔴',
  '🟢',
  '🟦',
  '🔷',
  '🧑',
  '🙎‍♂️',
  '🙎‍♀️',
  '🙎',
  '🔒',
  '🔓'
]

const deepCopyWorld = (world: World) => {
  const field: PropTypes[][] = []

  world.field.forEach((a) => {
    const temp: PropTypes[] = []
    a.forEach((b) => {
      temp.push(b)
    })
    field.push(temp)
  })

  const result: World = {
    size: world.size,
    field: field
  }

  return result
}

export class Game {
  world: World
  playWorld: World
  player: Player
  portals: Portals
  props: Array<Door | Button>

  constructor(
    world: World,
    player: Player,
    portals: Portals,
    props: Array<Door | Button>
  ) {
    this.world = world
    this.playWorld = deepCopyWorld(world)
    this.player = player
    this.portals = portals
    this.props = props
    if (this.toString().length > 2048 || this.toString().length <= 0) {
      throw new Error('World is too big or too small.')
    }

    if (world.field.length === world.size.height) {
      const test = world.field.every((row) => row.length === world.size.width)
      if (!test) {
        throw new Error('World is shorter or larger than its setting.')
      }
    } else {
      throw new Error('World is shorter or larger than its setting.')
    }

    if (!this.playerIsInTheWorld) {
      throw new Error('Player is out of world.')
    }

    this.playWorld.field[this.player.position.y][this.player.position.x] =
      PropTypes.PLAYER
  }

  get playerIsInTheWorld() {
    return this.world.field[this.player.position.y] !== undefined
      ? this.world.field[this.player.position.y][this.player.position.x] !==
          undefined
      : false
  }

  toString() {
    return this.playWorld.field
      .map((row) =>
        row
          .map((prop) => {
            return PropToEmoji[prop]
          })
          .join('')
      )
      .join('\n')
  }

  checkPlayerCanGoDirection(direction: Directions) {
    if (!this.playerIsInTheWorld) return false
    switch (direction) {
      case Directions.DOWN:
        return this.playWorld.field[this.player.position.y + 1] !== undefined
          ? GoThroughableBlocks.includes(
              this.playWorld.field[this.player.position.y + 1][
                this.player.position.x
              ]
            )
          : false
      case Directions.LEFT:
        return GoThroughableBlocks.includes(
          this.playWorld.field[this.player.position.y][
            this.player.position.x - 1
          ]
        )
      case Directions.RIGHT:
        return GoThroughableBlocks.includes(
          this.playWorld.field[this.player.position.y][
            this.player.position.x + 1
          ]
        )
      case Directions.UP:
        return this.playWorld.field[this.player.position.y - 1] !== undefined
          ? GoThroughableBlocks.includes(
              this.playWorld.field[this.player.position.y - 1][
                this.player.position.x
              ]
            )
          : false
      default:
        return false
    }
  }

  goTo(direction: Directions): boolean {
    if (this.playerIsInTheWorld && this.checkPlayerCanGoDirection(direction)) {
      this.playWorld.field[this.player.position.y][
        this.player.position.x
      ] = this.world.field[this.player.position.y][this.player.position.x]
      switch (direction) {
        case Directions.UP:
          this.player.position.y = this.player.position.y - 1
          if (
            this.playWorld.field[this.player.position.y][
              this.player.position.x
            ] === PropTypes.BLUE_PORTAL
          ) {
            this.player.position.x =
              this.portals.orange?.x ?? this.player.position.x
            this.player.position.y =
              this.portals.orange?.y ?? this.player.position.y
          } else if (
            this.playWorld.field[this.player.position.y][
              this.player.position.x
            ] === PropTypes.ORANGE_PORTAL
          ) {
            this.player.position.x =
              this.portals.blue?.x ?? this.player.position.x
            this.player.position.y =
              this.portals.blue?.y ?? this.player.position.y
          }
          break
        case Directions.DOWN:
          this.player.position.y = this.player.position.y + 1
          if (
            this.playWorld.field[this.player.position.y][
              this.player.position.x
            ] === PropTypes.BLUE_PORTAL
          ) {
            this.player.position.x =
              this.portals.orange?.x ?? this.player.position.x
            this.player.position.y =
              this.portals.orange?.y ?? this.player.position.y
          } else if (
            this.playWorld.field[this.player.position.y][
              this.player.position.x
            ] === PropTypes.ORANGE_PORTAL
          ) {
            this.player.position.x =
              this.portals.blue?.x ?? this.player.position.x
            this.player.position.y =
              this.portals.blue?.y ?? this.player.position.y
          }
          break
        case Directions.LEFT:
          this.player.position.x = this.player.position.x - 1
          if (
            this.playWorld.field[this.player.position.y][
              this.player.position.x
            ] === PropTypes.BLUE_PORTAL
          ) {
            this.player.position.x =
              this.portals.orange?.x ?? this.player.position.x
            this.player.position.y =
              this.portals.orange?.y ?? this.player.position.y
          } else if (
            this.playWorld.field[this.player.position.y][
              this.player.position.x
            ] === PropTypes.ORANGE_PORTAL
          ) {
            this.player.position.x =
              this.portals.blue?.x ?? this.player.position.x
            this.player.position.y =
              this.portals.blue?.y ?? this.player.position.y
          }
          break
        case Directions.RIGHT:
          this.player.position.x = this.player.position.x + 1
          if (
            this.playWorld.field[this.player.position.y][
              this.player.position.x
            ] === PropTypes.BLUE_PORTAL
          ) {
            this.player.position.x =
              this.portals.orange?.x ?? this.player.position.x
            this.player.position.y =
              this.portals.orange?.y ?? this.player.position.y
          } else if (
            this.playWorld.field[this.player.position.y][
              this.player.position.x
            ] === PropTypes.ORANGE_PORTAL
          ) {
            this.player.position.x =
              this.portals.blue?.x ?? this.player.position.x
            this.player.position.y =
              this.portals.blue?.y ?? this.player.position.y
          }
          break
        default:
          return false
      }
      this.playWorld.field[this.player.position.y][this.player.position.x] =
        PropTypes.PLAYER
      return true
    } else {
      return false
    }
  }
}
