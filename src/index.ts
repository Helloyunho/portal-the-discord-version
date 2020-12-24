import {
  Client,
  Intents,
  Message,
  MessageReaction,
  User
} from 'https://raw.githubusercontent.com/Helloyunho/harmony/main/mod.ts'
import { DISCORD_TOKEN } from '../config.ts'
import { Game } from './structures/game.ts'
import { PropTypes, PortalgunStates } from './types/other.ts'
import { Directions, Player } from './types/player.ts'
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
          width: 27,
          height: 19
        }
      }

      for (let l = 0; l < world.size.height; l++) {
        const row = []
        for (let i = 0; i < world.size.width; i++) {
          if (i === 2) {
            row.push(PropTypes.WALL)
            continue
          }
          row.push(PropTypes.NONE)
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

      const game = new Game(world, player)
      GamePerUser[message.author.id] = game
      message.channel.send(game.toString())
    }
  }

  async messageReactionAdd(reaction: MessageReaction, user: User) {
    if (user.bot || !(user.id in GamePerUser)) {
      return
    }

    const gameMessage = GamePerUser[user.id]

    switch (reaction.emoji.name) {
      case '⬆️':
        reaction.message
        gameMessage.goTo(Directions.UP)
        reaction.message.edit(gameMessage.toString())
    }
  }
}

const bot = new Portal()
bot.connect(DISCORD_TOKEN, Intents.None)
