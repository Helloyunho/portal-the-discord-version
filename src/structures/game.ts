import { Directions, Player } from '../types/player.ts'
import { World } from '../types/world.ts'
import { GoThroughableBlocks, Position } from '../types/other.ts'
import {
  Button,
  CubeDropper,
  Door,
  DropableProps,
  Portals,
  PropTypes,
  UsableProps
} from '../types/props.ts'
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
  '🟪',
  '💁'
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
  on(event: 'timerDone', listener: () => void): this
  on(event: string, listener: Function): this
}

export class Game extends EventEmitter {
  world: World
  playWorld: World
  player: Player
  portals: Portals
  props: Array<Door | Button | CubeDropper>
  waitingForBluePortalDirection = false
  waitingForOrangePortalDirection = false
  waitingForDropDirection = false
  tick = 0
  tickIntervelID = 0
  tickVars: {
    goo: number | null
    props: { [id: string]: number }
  } = {
    goo: null,
    props: {}
  }
  messageID?: string

  constructor(
    world: World,
    player: Player,
    portals: Portals,
    props: Array<Door | Button | CubeDropper>
  ) {
    super()
    this.world = world
    this.playWorld = deepCopyWorld(world)
    this.player = player
    this.portals = portals
    this.props = props

    if (
      this.world.size.height * this.world.size.width > 200 ||
      this.world.size.height * this.world.size.width <= 0
    ) {
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

    if (this.portals.blue !== null) {
      this.world.field[this.portals.blue.y][this.portals.blue.x] =
        PropTypes.BLUE_PORTAL
      this.playWorld.field[this.portals.blue.y][this.portals.blue.x] =
        PropTypes.BLUE_PORTAL
    }

    if (this.portals.orange !== null) {
      this.world.field[this.portals.orange.y][this.portals.orange.x] =
        PropTypes.ORANGE_PORTAL
      this.playWorld.field[this.portals.orange.y][this.portals.orange.x] =
        PropTypes.ORANGE_PORTAL
    }

    props.forEach((prop) => {
      if (
        this.world.field[prop.position.y] === undefined ||
        this.world.field[prop.position.y][prop.position.x] === undefined
      ) {
        throw new Error('Prop settings are weird.')
      }
      switch (prop.type) {
        case 'button': {
          const normalButton = prop.cube
            ? PropTypes.CUBE_BUTTON
            : PropTypes.BUTTON
          const activatedButton = prop.cube
            ? PropTypes.ACTIVATED_CUBE_BUTTON
            : PropTypes.ACTIVATED_BUTTON
          this.world.field[prop.position.y][prop.position.x] = prop.activated
            ? activatedButton
            : normalButton
          this.playWorld.field[prop.position.y][
            prop.position.x
          ] = prop.activated ? activatedButton : normalButton
          break
        }

        case 'cubedropper': {
          break
        }

        case 'door': {
          this.world.field[prop.position.y][prop.position.x] = prop.activated
            ? PropTypes.OPENED_DOOR
            : PropTypes.CLOSED_DOOR
          this.playWorld.field[prop.position.y][
            prop.position.x
          ] = prop.activated ? PropTypes.OPENED_DOOR : PropTypes.CLOSED_DOOR
          break
        }
      }
    })

    if (!this.arePortalsReal) {
      throw new Error('Portal settings are weird.')
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

  getUsablePropPosition() {
    if (!this.playerIsInTheWorld) return []
    const result: Position[] = []

    const left = UsableProps.includes(
      this.playWorld.field[this.player.position.y][this.player.position.x - 1]
    )
    const right = UsableProps.includes(
      this.playWorld.field[this.player.position.y][this.player.position.x + 1]
    )
    const up =
      this.playWorld.field[this.player.position.y - 1] !== undefined
        ? UsableProps.includes(
            this.playWorld.field[this.player.position.y - 1][
              this.player.position.x
            ]
          )
        : false
    const down =
      this.playWorld.field[this.player.position.y + 1] !== undefined
        ? UsableProps.includes(
            this.playWorld.field[this.player.position.y + 1][
              this.player.position.x
            ]
          )
        : false

    if (left) {
      result.push({
        x: this.player.position.x - 1,
        y: this.player.position.y
      })
    }
    if (right) {
      result.push({
        x: this.player.position.x + 1,
        y: this.player.position.y
      })
    }
    if (up) {
      result.push({
        x: this.player.position.x,
        y: this.player.position.y - 1
      })
    }
    if (down) {
      result.push({
        x: this.player.position.x,
        y: this.player.position.y + 1
      })
    }

    return result
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

      if (
        this.playWorld.field[this.player.position.y][this.player.position.x] ===
        PropTypes.CLEAR_FIELD
      ) {
        if (this.portals.blue !== null) {
          this.world.field[this.portals.blue.y][this.portals.blue.x] =
            PropTypes.NONE
          this.playWorld.field[this.portals.blue.y][this.portals.blue.x] =
            PropTypes.NONE
        }
        if (this.portals.orange !== null) {
          this.world.field[this.portals.orange.y][this.portals.orange.x] =
            PropTypes.NONE
          this.playWorld.field[this.portals.orange.y][this.portals.orange.x] =
            PropTypes.NONE
        }

        this.portals = {
          blue: null,
          orange: null
        }
      }

      this.playWorld.field[this.player.position.y][
        this.player.position.x
      ] = this.player.holding
        ? PropTypes.PLAYER_HOLDING_A_CUBE
        : PropTypes.PLAYER

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

  toggleUse() {
    const propPositions: Position[] = this.getUsablePropPosition()

    propPositions.forEach((propPosition) => {
      if (propPosition === undefined) return

      const prop = this.playWorld.field[propPosition.y][propPosition.x]

      if (prop === undefined) {
        return
      } else if (
        prop === PropTypes.CUBE ||
        prop === PropTypes.ACTIVATED_CUBE_BUTTON
      ) {
        this.player.holding = true
        this.playWorld.field[this.player.position.y][this.player.position.x] =
          PropTypes.PLAYER_HOLDING_A_CUBE
        this.playWorld.field[propPosition.y][propPosition.x] =
          prop === PropTypes.CUBE ? PropTypes.NONE : PropTypes.CUBE_BUTTON
        this.world.field[propPosition.y][propPosition.x] =
          prop === PropTypes.CUBE ? PropTypes.NONE : PropTypes.CUBE_BUTTON
        return
      } else if (prop === PropTypes.BUTTON) {
        const index = this.props.findIndex((p) => {
          return (
            p.position.x === propPosition.x && p.position.y === propPosition.y
          )
        })
        const propProperty = this.props[index]

        if (propProperty === undefined || propProperty.type !== 'button') {
          return
        }

        if (propProperty.timer !== undefined) {
          this.tickVars.props[
            `${propProperty.position.x},${propProperty.position.y}`
          ] = propProperty.timer
        }

        this.props[index] = {
          ...propProperty,
          activated: true
        }
        this.world.field[propProperty.position.y][propProperty.position.x] =
          PropTypes.ACTIVATED_BUTTON
        this.playWorld.field[propProperty.position.y][propProperty.position.x] =
          PropTypes.ACTIVATED_BUTTON
        if (propProperty.activate !== null) {
          const index = this.props.findIndex((p) => {
            return (
              p.position.x === propProperty.activate?.x &&
              p.position.y === propProperty.activate.y
            )
          })
          const target = this.props[index]
          if (target === undefined) {
            return
          }

          this.props[index] = {
            ...target,
            activated: true
          }

          if (target.type === 'door') {
            this.world.field[target.position.y][target.position.x] =
              PropTypes.OPENED_DOOR
            this.playWorld.field[target.position.y][target.position.x] =
              PropTypes.OPENED_DOOR
          } else if (target.type === 'cubedropper') {
            this.world.field[target.position.y][target.position.x] =
              PropTypes.CUBE
            this.playWorld.field[target.position.y][target.position.x] =
              PropTypes.CUBE
          }
        }
      }
    })
  }

  drop(direction: Directions) {
    if (!this.playerIsInTheWorld) return

    let x: number | undefined = undefined,
      y: number | undefined = undefined
    switch (direction) {
      case Directions.UP: {
        if (this.playWorld.field[this.player.position.y - 1] !== undefined) {
          if (
            DropableProps.includes(
              this.playWorld.field[this.player.position.y - 1][
                this.player.position.x
              ]
            )
          ) {
            x = this.player.position.x
            y = this.player.position.y - 1
          }
        }
        break
      }
      case Directions.DOWN: {
        if (this.playWorld.field[this.player.position.y + 1] !== undefined) {
          if (
            DropableProps.includes(
              this.playWorld.field[this.player.position.y + 1][
                this.player.position.x
              ]
            )
          ) {
            x = this.player.position.x
            y = this.player.position.y + 1
          }
        }
        break
      }
      case Directions.LEFT: {
        if (
          DropableProps.includes(
            this.playWorld.field[this.player.position.y][
              this.player.position.x - 1
            ]
          )
        ) {
          x = this.player.position.x - 1
          y = this.player.position.y
        }
        break
      }
      case Directions.RIGHT: {
        if (
          DropableProps.includes(
            this.playWorld.field[this.player.position.y][
              this.player.position.x + 1
            ]
          )
        ) {
          x = this.player.position.x + 1
          y = this.player.position.y
        }
        break
      }
      default:
        return
    }

    if (y !== undefined && x !== undefined) {
      if (this.playWorld.field[y][x] === PropTypes.CUBE_BUTTON) {
        this.world.field[y][x] = PropTypes.ACTIVATED_CUBE_BUTTON
        this.playWorld.field[y][x] = PropTypes.ACTIVATED_CUBE_BUTTON
        const index = this.props.findIndex(
          (p) => p.position.x === x && p.position.y === y
        )
        const prop = this.props[index]

        if (prop === undefined || prop.type !== 'button') {
          return
        }

        this.props[index] = {
          ...prop,
          activated: true
        }

        if (prop.activate !== null) {
          const index = this.props.findIndex((p) => {
            return (
              p.position.x === prop.activate?.x &&
              p.position.y === prop.activate.y
            )
          })
          const target = this.props[index]
          if (target === undefined) {
            return
          }

          this.props[index] = {
            ...target,
            activated: true
          }

          if (target.type === 'door') {
            this.world.field[target.position.y][target.position.x] =
              PropTypes.OPENED_DOOR
            this.playWorld.field[target.position.y][target.position.x] =
              PropTypes.OPENED_DOOR
          } else if (target.type === 'cubedropper') {
            this.world.field[target.position.y][target.position.x] =
              PropTypes.CUBE
            this.playWorld.field[target.position.y][target.position.x] =
              PropTypes.CUBE
          }
        }
      } else {
        this.world.field[y][x] = PropTypes.CUBE
        this.playWorld.field[y][x] = PropTypes.CUBE
      }

      this.playWorld.field[this.player.position.y][this.player.position.x] =
        PropTypes.PLAYER
      this.player.holding = false
    }
  }

  onTick(tick: number) {
    const playerOn = this.world.field[this.player.position.y][
      this.player.position.x
    ]

    if (playerOn === PropTypes.GOO) {
      if (this.tickVars.goo === null) {
        this.tickVars.goo = tick
        this.health -= 20
      } else {
        if ((tick - this.tickVars.goo) % 1000 === 0) {
          this.health -= 20
        }
      }
    } else if (this.tickVars.goo !== null) {
      this.tickVars.goo = null
    }

    Object.entries(this.tickVars.props).forEach(([key, time]) => {
      time--
      this.tickVars.props[key] = time

      if (time === 0) {
        delete this.tickVars.props[key]
        const [x, y] = key.split(',').map((a) => parseInt(a))

        const index = this.props.findIndex((p) => {
          return p.position.x === x && p.position.y === y
        })
        const prop = this.props[index]

        if (prop === undefined || prop.type !== 'button') {
          return
        }
        this.props[index] = {
          ...prop,
          activated: false
        }
        this.world.field[prop.position.y][prop.position.x] = prop.cube
          ? PropTypes.CUBE_BUTTON
          : PropTypes.BUTTON
        this.playWorld.field[prop.position.y][prop.position.x] = prop.cube
          ? PropTypes.CUBE_BUTTON
          : PropTypes.BUTTON

        if (prop.activate !== null) {
          let index = 0
          const target = this.props.find((p, i) => {
            index = i
            return (
              p.position.x === prop.activate?.x &&
              p.position.y === prop.activate.y
            )
          })

          if (target !== undefined && target.type !== 'button') {
            this.props[index] = {
              ...target,
              activated: false
            }
            if (target.type === 'door') {
              this.world.field[target.position.y][target.position.x] =
                PropTypes.CLOSED_DOOR
              this.playWorld.field[target.position.y][target.position.x] =
                PropTypes.CLOSED_DOOR
            }
          }
        }
        this.emit('timerDone')
      }
    })

    if (this.player.health <= 0) {
      this.emit('dead')
    }
  }

  close() {
    clearInterval(this.tickIntervelID)
    this.removeAllListeners()
  }
}
