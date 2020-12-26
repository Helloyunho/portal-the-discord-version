import {
  Client,
  Embed,
  Intents,
  Message,
  MessageReaction,
  User
} from 'https://raw.githubusercontent.com/harmony-org/harmony/main/mod.ts'
import { DISCORD_TOKEN } from '../config.ts'
import { Game } from './structures/game.ts'
import {
  PropTypes,
  PortalgunStates,
  MovementEmojis,
  BluePortalEmoji,
  OrangePortalEmoji,
  PortalEmojis
} from './types/other.ts'
import { Directions, Player } from './types/player.ts'
import { Portals } from './types/props.ts'
import { World } from './types/world.ts'

const GamePerUser: { [key: string]: Game } = {}

const embedMaker = (game: Game) => {
  const portalgunState = game.player.portalgun

  return new Embed({
    title: 'Portal: The Discord Version',
    description: game.toString(),
    fields: [
      {
        name: 'Health',
        value: game.health.toString(),
        inline: true
      },
      {
        name: 'Portalgun',
        value:
          portalgunState !== PortalgunStates.NONE
            ? portalgunState !== PortalgunStates.BLUE_ONLY
              ? portalgunState !== PortalgunStates.ORANGE_ONLY
                ? PortalEmojis.join(' ')
                : OrangePortalEmoji
              : BluePortalEmoji
            : '⚫️',
        inline: true
      }
    ]
  })
}

class Portal extends Client {
  constructor(...args: any[]) {
    super(...args)
    this.on('ready', this.ready)
    this.on('messageCreate', this.message)
    this.on('messageReactionAdd', this.messageReactionAdd)
    this.on('messageReactionRemove', this.messageReactionRemove)
  }

  ready() {
    console.log('Running!')
  }

  async message(message: Message) {
    if (message.content === '!start') {
      const world: World = {
        field: [],
        size: {
          width: 15,
          height: 10
        }
      }

      for (let l = 0; l < world.size.height; l++) {
        const row = []
        for (let i = 0; i < world.size.width; i++) {
          if (i === 2) {
            row.push(PropTypes.WALL)
            continue
          } else if (i === 5) {
            row.push(PropTypes.GOO)
          } else if (i === 1 && l === 0) {
            row.push(PropTypes.BLUE_PORTAL)
            continue
          } else if (i === 3 && l === 9) {
            row.push(PropTypes.ORANGE_PORTAL)
            continue
          } else {
            row.push(PropTypes.NONE)
          }
        }
        world.field.push(row)
      }

      const player: Player = {
        position: {
          x: 1,
          y: 1
        },
        portalgun: PortalgunStates.ALL,
        health: 100
      }

      const portals: Portals = {
        blue: {
          x: 1,
          y: 0
        },
        orange: {
          x: 3,
          y: 9
        }
      }

      const game = new Game(world, player, portals, [])
      GamePerUser[message.author.id] = game

      const embed = embedMaker(game)
      const sentMessage = await message.channel.send(embed)

      game.on('healthChange', (_health: number) => {
        const embed = embedMaker(game)
        sentMessage.edit(embed)
      })

      game.on('dead', () => {
        game.close()
        delete GamePerUser[message.author.id]

        message.channel.send('You died! And the game is closed.')
      })

      for (const emoji of MovementEmojis) {
        await sentMessage.addReaction(emoji)
      }

      if (game.player.portalgun === PortalgunStates.BLUE_ONLY) {
        await sentMessage.addReaction(BluePortalEmoji)
      } else if (game.player.portalgun === PortalgunStates.ORANGE_ONLY) {
        await sentMessage.addReaction(OrangePortalEmoji)
      } else if (game.player.portalgun === PortalgunStates.ALL) {
        await sentMessage.addReaction(BluePortalEmoji)
        await sentMessage.addReaction(OrangePortalEmoji)
      }

      sentMessage.addReaction('🛑')
    }
  }

  async messageReactionAdd(reaction: MessageReaction, user: User) {
    if (
      user.bot ||
      !(user.id in GamePerUser) ||
      GamePerUser[user.id].messageID === reaction.message.id
    ) {
      return
    }

    const game = GamePerUser[user.id]

    if (reaction.emoji.name === '🛑') {
      game.close()
      delete GamePerUser[user.id]

      reaction.message.channel.send('Game has been ended.')
    }

    if (
      reaction.emoji.name === BluePortalEmoji &&
      !game.waitingForBluePortalDirection
    ) {
      if (game.waitingForOrangePortalDirection) {
        game.waitingForOrangePortalDirection = false
        reaction.message.removeReaction(reaction.emoji.name, user)
      }
      game.waitingForBluePortalDirection = true
      return
    }

    if (
      reaction.emoji.name === OrangePortalEmoji &&
      !game.waitingForOrangePortalDirection
    ) {
      if (game.waitingForBluePortalDirection) {
        game.waitingForBluePortalDirection = false
        reaction.message.removeReaction(reaction.emoji.name, user)
      }
      game.waitingForOrangePortalDirection = true
      return
    }

    if (
      (game.waitingForBluePortalDirection ||
        game.waitingForOrangePortalDirection) &&
      MovementEmojis.includes(reaction.emoji.name)
    ) {
      let direction: Directions

      switch (reaction.emoji.name) {
        case '⬆': {
          reaction.message.removeReaction(reaction.emoji, user)
          direction = Directions.UP
          break
        }
        case '⬇': {
          reaction.message.removeReaction(reaction.emoji, user)
          direction = Directions.DOWN
          break
        }
        case '⬅': {
          reaction.message.removeReaction(reaction.emoji, user)
          direction = Directions.LEFT
          break
        }
        case '➡': {
          reaction.message.removeReaction(reaction.emoji, user)
          direction = Directions.RIGHT
          break
        }
        default:
          return
      }

      if (game.waitingForBluePortalDirection) {
        reaction.message.removeReaction(BluePortalEmoji, user)
      } else if (game.waitingForOrangePortalDirection) {
        reaction.message.removeReaction(OrangePortalEmoji, user)
      }
      game.shootPortal(direction)

      const embed = embedMaker(game)
      reaction.message.edit(embed)
      return
    }

    if (MovementEmojis.includes(reaction.emoji.name)) {
      switch (reaction.emoji.name) {
        case '⬆': {
          reaction.message.removeReaction(reaction.emoji, user)
          game.goTo(Directions.UP)
          break
        }
        case '⬇': {
          reaction.message.removeReaction(reaction.emoji, user)
          game.goTo(Directions.DOWN)
          break
        }
        case '⬅': {
          reaction.message.removeReaction(reaction.emoji, user)
          game.goTo(Directions.LEFT)
          break
        }
        case '➡': {
          reaction.message.removeReaction(reaction.emoji, user)
          game.goTo(Directions.RIGHT)
          break
        }
        default:
          return
      }

      const embed = embedMaker(game)
      reaction.message.edit(embed)
    }
  }

  async messageReactionRemove(reaction: MessageReaction, user: User) {
    if (
      user.bot ||
      !(user.id in GamePerUser) ||
      GamePerUser[user.id].messageID === reaction.message.id
    ) {
      return
    }

    const game = GamePerUser[user.id]

    if (
      reaction.emoji.name === BluePortalEmoji &&
      game.waitingForBluePortalDirection
    ) {
      game.waitingForBluePortalDirection = false
      return
    }

    if (
      reaction.emoji.name === OrangePortalEmoji &&
      game.waitingForOrangePortalDirection
    ) {
      game.waitingForOrangePortalDirection = false
      return
    }
  }
}

const bot = new Portal()
bot.connect(DISCORD_TOKEN, Intents.None)
