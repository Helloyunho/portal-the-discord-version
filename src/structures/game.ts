import { Directions, Player } from '../types/player.ts'
import { World } from '../types/world.ts'
import { PropTypes, GoThroughableBlocks } from '../types/other.ts'

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

export class Game {
  world: World
  playWorld: World
  player: Player

  constructor(world: World, player: Player) {
    this.world = world
    this.playWorld = world
    this.player = player
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
    return this.world.field
      .map((row) => row.map((prop) => PropToEmoji[prop]).join(''))
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
          break
        case Directions.DOWN:
          this.player.position.y = this.player.position.y + 1
          break
        case Directions.LEFT:
          this.player.position.x = this.player.position.x - 1
          break
        case Directions.RIGHT:
          this.player.position.x = this.player.position.x + 1
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
