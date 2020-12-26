import { Directions, Player } from '../types/player.ts'
import { World } from '../types/world.ts'
import { PropTypes, GoThroughableBlocks } from '../types/other.ts'
import { Button, Door, Portals } from '../types/props.ts'
import { EventEmitter } from 'https://deno.land/std@0.82.0/node/events.ts'

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
  '🔓',
  '🟪'
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

export declare interface Game {
  on(event: 'healthChange', listener: (health: number) => void): this
  on(event: 'tick', listener: (tick: number) => void): this
  on(event: 'dead', listener: () => void): this
  on(event: string, listener: Function): this
}

export class Game extends EventEmitter {
  world: World
  playWorld: World
  player: Player
  portals: Portals
  props: Array<Door | Button>
  waitingForBluePortalDirection = false
  waitingForOrangePortalDirection = false
  tick = 0
  tickIntervelID = 0
  tickVars: { [name: string]: number } = {}
  messageID?: string

  constructor(
    world: World,
    player: Player,
    portals: Portals,
    props: Array<Door | Button>
  ) {
    super()
    this.world = world
    this.playWorld = deepCopyWorld(world)
    this.player = player
    this.portals = portals
    this.props = props

    if (this.toString().length > 200 || this.toString().length <= 0) {
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

    if (!this.arePortalsReal) {
      throw new Error('Portals are not in the world (or set wrong).')
    }

    this.playWorld.field[this.player.position.y][this.player.position.x] =
      PropTypes.PLAYER

    this.tickIntervelID = setInterval(() => {
      this.tick++
      this.emit('tick', this.tick)
    }, 1)

    this.on('tick', this.onTick)
  }

  get playerIsInTheWorld() {
    return this.world.field[this.player.position.y] !== undefined
      ? this.world.field[this.player.position.y][this.player.position.x] !==
          undefined
      : false
  }

  get arePortalsReal() {
    if (
      this.portals.blue !== null &&
      this.portals.orange !== null &&
      !this.portalsAreInTheWorld
    ) {
      return false
    }

    const blueTest =
      this.portals.blue !== null
        ? this.world.field[this.portals.blue.y][this.portals.blue.x] ===
          PropTypes.BLUE_PORTAL
        : true

    const orangeTest =
      this.portals.orange !== null
        ? this.world.field[this.portals.orange.y][this.portals.orange.x] ===
          PropTypes.ORANGE_PORTAL
        : true

    return blueTest && orangeTest
  }

  get portalsAreInTheWorld() {
    const blueTest =
      this.portals.blue !== null
        ? this.world.field[this.portals.blue.y] !== undefined
          ? this.world.field[this.portals.blue.y][this.portals.blue.x] !==
            undefined
          : false
        : false

    const orangeTest =
      this.portals.orange !== null
        ? this.world.field[this.portals.orange.y] !== undefined
          ? this.world.field[this.portals.orange.y][this.portals.orange.x] !==
            undefined
          : false
        : false

    return blueTest && orangeTest
  }

  get health() {
    return this.player.health
  }

  set health(health: number) {
    this.player.health = health
    this.emit('healthChange', this.player.health)
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
        case Directions.UP: {
          this.player.position.y = this.player.position.y - 1
          break
        }
        case Directions.DOWN: {
          this.player.position.y = this.player.position.y + 1
          break
        }
        case Directions.LEFT: {
          this.player.position.x = this.player.position.x - 1
          break
        }
        case Directions.RIGHT: {
          this.player.position.x = this.player.position.x + 1
          break
        }
        default:
          return false
      }
      if (
        this.playWorld.field[this.player.position.y][this.player.position.x] ===
        PropTypes.BLUE_PORTAL
      ) {
        this.player.position.x =
          this.portals.orange?.x ?? this.player.position.x
        this.player.position.y =
          this.portals.orange?.y ?? this.player.position.y
      } else if (
        this.playWorld.field[this.player.position.y][this.player.position.x] ===
        PropTypes.ORANGE_PORTAL
      ) {
        this.player.position.x = this.portals.blue?.x ?? this.player.position.x
        this.player.position.y = this.portals.blue?.y ?? this.player.position.y
      }

      this.playWorld.field[this.player.position.y][this.player.position.x] =
        PropTypes.PLAYER

      return true
    } else {
      return false
    }
  }

  shootPortal(direction: Directions) {
    if (!this.playerIsInTheWorld) return

    let portal = this.waitingForBluePortalDirection
      ? this.portals.blue
      : this.portals.orange

    if (portal !== null) {
      if (
        [PropTypes.BLUE_PORTAL, PropTypes.ORANGE_PORTAL].includes(
          this.world.field[portal.y][portal.x]
        )
      ) {
        this.world.field[portal.y][portal.x] = PropTypes.NONE
        this.playWorld.field[portal.y][portal.x] = PropTypes.NONE
      } else {
        this.playWorld.field[portal.y][portal.x] = this.world.field[portal.y][
          portal.x
        ]
      }
    }

    switch (direction) {
      case Directions.UP: {
        for (let y = this.player.position.y; y >= 0; y--) {
          if (this.world.field[y][this.player.position.x] === PropTypes.WALL) {
            if (
              this.world.field[y + 1][this.player.position.x] === PropTypes.NONE
            ) {
              portal = {
                x: this.player.position.x,
                y: y + 1
              }
            }
            break
          }
        }
        break
      }
      case Directions.DOWN: {
        for (let y = this.player.position.y; y < this.world.size.height; y++) {
          if (this.world.field[y][this.player.position.x] === PropTypes.WALL) {
            if (
              this.world.field[y - 1][this.player.position.x] === PropTypes.NONE
            ) {
              portal = {
                x: this.player.position.x,
                y: y - 1
              }
            }
            break
          }
        }
        break
      }
      case Directions.LEFT: {
        for (let x = this.player.position.x; x >= 0; x--) {
          if (this.world.field[this.player.position.y][x] === PropTypes.WALL) {
            if (
              this.world.field[this.player.position.y][x + 1] === PropTypes.NONE
            ) {
              portal = {
                x: x + 1,
                y: this.player.position.y
              }
            }
            break
          }
        }
        break
      }
      case Directions.RIGHT: {
        for (let x = this.player.position.x; x < this.world.size.width; x++) {
          if (this.world.field[this.player.position.y][x] === PropTypes.WALL) {
            if (
              this.world.field[this.player.position.y][x - 1] === PropTypes.NONE
            ) {
              portal = {
                x: x - 1,
                y: this.player.position.y
              }
            }
            break
          }
        }
        break
      }
      default:
        return
    }

    if (portal !== null) {
      this.playWorld.field[portal.y][portal.x] = this
        .waitingForBluePortalDirection
        ? PropTypes.BLUE_PORTAL
        : PropTypes.ORANGE_PORTAL
      this.world.field[portal.y][portal.x] = this.waitingForBluePortalDirection
        ? PropTypes.BLUE_PORTAL
        : PropTypes.ORANGE_PORTAL

      if (this.waitingForBluePortalDirection) {
        this.portals.blue = {
          x: portal.x,
          y: portal.y
        }
      } else {
        this.portals.orange = {
          x: portal.x,
          y: portal.y
        }
      }
    }

    this.waitingForBluePortalDirection = false
    this.waitingForOrangePortalDirection = false
  }

  onTick(tick: number) {
    const playerOn = this.world.field[this.player.position.y][
      this.player.position.x
    ]

    if (playerOn === PropTypes.GOO) {
      if (this.tickVars.goo === undefined) {
        this.tickVars.goo = tick
        this.health -= 20
        return
      } else {
        if ((tick - this.tickVars.goo) % 1000 === 0) {
          this.health -= 20
        }
      }
    }

    if (this.player.health <= 0) {
      this.emit('dead')
    }
  }

  close() {
    clearInterval(this.tickIntervelID)
    this.removeAllListeners()
  }
}
