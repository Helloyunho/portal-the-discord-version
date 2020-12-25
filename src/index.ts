import {
  Client,
  Embed,
  Intents,
  Message,
  MessageReaction,
  User
} from 'https://raw.githubusercontent.com/Helloyunho/harmony/reaction/mod.ts'
import { DISCORD_TOKEN } from '../config.ts'
import { Game } from './structures/game.ts'
import { PropTypes, PortalgunStates, MovementEmojis } from './types/other.ts'
import { Directions, Player } from './types/player.ts'
import { Portals } from './types/props.ts'
import { World } from './types/world.ts'

const GamePerUser: { [key: string]: Game } = {}

class Portal extends Client {
  constructor(...args: any[]) {
    super(...args)
    this.on('ready', this.ready)
    this.on('messageCreate', this.message)
    this.on('messageReactionAdd', this.messageReactionAdd)
  }

  ready() {
    console.log('Running!')
  }

  async message(message: Message) {
    if (message.content === '!start') {
      const world: World = {
        field: [],
        size: {
          width: 20,
          height: 12
        }
      }

      for (let l = 0; l < world.size.height; l++) {
        const row = []
        for (let i = 0; i < world.size.width; i++) {
          if (i === 2) {
            row.push(PropTypes.WALL)
            continue
          } else if (i === 1 && l === 0) {
            row.push(PropTypes.BLUE_PORTAL)
            continue
          } else if (i === 3 && l === 10) {
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
        portalgun: PortalgunStates.NONE
      }

      const portals: Portals = {
        blue: {
          x: 1,
          y: 0
        },
        orange: {
          x: 3,
          y: 10
        }
      }

      const game = new Game(world, player, portals, [])
      GamePerUser[message.author.id] = game
      console.log(game.toString())

      const embed = new Embed({
        title: 'Portal: The Discord Version',
        description: game.toString()
      })
      const sentMessage = await message.channel.send(embed)

      MovementEmojis.forEach((emoji) => {
        sentMessage.addReaction(emoji)
      })
    }
  }

  async messageReactionAdd(reaction: MessageReaction, user: User) {
    if (user.bot || !(user.id in GamePerUser)) {
      return
    }

    const game = GamePerUser[user.id]

    if (MovementEmojis.includes(reaction.emoji.name)) {
      switch (reaction.emoji.name) {
        case '⬆':
          reaction.message.removeReaction(reaction.emoji, user)
          game.goTo(Directions.UP)
          break
        case '⬇':
          reaction.message.removeReaction(reaction.emoji, user)
          game.goTo(Directions.DOWN)
          break
        case '⬅':
          reaction.message.removeReaction(reaction.emoji, user)
          game.goTo(Directions.LEFT)
          break
        case '➡':
          reaction.message.removeReaction(reaction.emoji, user)
          game.goTo(Directions.RIGHT)
          break
        default:
          return
      }

      const embed = new Embed({
        title: 'Portal: The Discord Version',
        description: game.toString()
      })
      reaction.message.edit(embed)
    }
  }
}

const bot = new Portal()
bot.connect(DISCORD_TOKEN, Intents.None)
