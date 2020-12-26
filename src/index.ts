import {
  ChannelTypes,
  Client,
  Embed,
  Intents,
  Message,
  MessageReaction,
  User
} from 'https://raw.githubusercontent.com/harmony-org/harmony/main/mod.ts'
import { DISCORD_TOKEN } from '../config.ts'
import { Game, PropEmoji } from './structures/game.ts'
import {
  PortalgunStates,
  MovementEmojis,
  BluePortalEmoji,
  OrangePortalEmoji,
  PortalEmojis,
  translatePerType,
  Position
} from './types/other.ts'
import { Directions, Player } from './types/player.ts'
import {
  ActivatableProps,
  ActivatedButtonProps,
  AllButtonProps,
  AllDoorProps,
  Button,
  CubeButtonProps,
  CubeDropper,
  Door,
  Portals,
  PropTypes
} from './types/props.ts'
import { World, WorldData, WorldGenerator } from './types/world.ts'

const GamePerUser: {
  [key: string]: Game
} = {}

const getMessageInPromise = (
  eventEmitter: Client,
  checker: (message: Message) => boolean,
  timeout?: number
): Promise<Message | undefined> => {
  return new Promise((resolve, _reject) => {
    let timeoutID: number | undefined
    if (timeout !== undefined) {
      timeoutID = setTimeout(() => {
        eventEmitter.off('messageCreate', func)
        resolve(undefined)
      }, timeout)
    }
    const func = (message: Message) => {
      if (checker(message)) {
        resolve(message)
        eventEmitter.off('messageCreate', func)
        if (timeoutID !== undefined) clearTimeout(timeoutID)
      }
    }
    eventEmitter.on('messageCreate', func)
  })
}

const worldDatas: {
  lastSavedID: number
  worlds: { [id: string]: WorldData }
} = JSON.parse(Deno.readTextFileSync('../maps.json'))

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
    if (message.author.bot) return
    if (message.content.startsWith('!play')) {
      if (message.channel.type === ChannelTypes.DM) {
        message.channel.send(
          '이 명령어는 리엑션 삭제 기능이 필요하게 때문에, DM에서 사용하실 수 없습니다.'
        )
        return
      }
      const args = message.content.split(' ')
      const worldData = worldDatas.worlds[args[1]]
      if (worldData === undefined) {
        message.channel.send('월드가 없습니다!')
        return
      }

      const { world, player, portals, props } = worldData

      const game = new Game(world, player, portals, props)
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

        setTimeout(sentMessage.delete.bind(sentMessage), 1000)
        message.channel.send('당신은 죽었습니다! 그리고 게임은 끝났습니다.')
      })

      game.on('timerDone', () => {
        const embed = embedMaker(game)
        sentMessage.edit(embed)
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

      await sentMessage.addReaction('🔘')
      await sentMessage.addReaction('🛑')

      game.on('worldFinished', () => {
        game.close()
        delete GamePerUser[message.author.id]

        setTimeout(sentMessage.delete.bind(sentMessage), 1000)
        message.channel.send('축하드립니다! 게임을 깨셨습니다!')
      })
    } else if (message.content === '!make') {
      if (message.channel.type !== ChannelTypes.DM) {
        message.channel.send(
          '이 명령어는 많은 메시지를 주고 받아야하기 때문에, DM에서만 사용 가능합니다.'
        )
        return
      }

      const user = message.author
      message.channel.send(
        '안녕하세요! 맵 메이커에 오신것을 환영합니다.\n좌표의 맨 왼쪽 위는 `(0, 0)` 입니다.\n**이 이하에 있는 것들은 한번 진행후 수정 할 수 없습니다!!**'
      )
      const getWorldSize = async (): Promise<[number, number] | undefined> => {
        message.channel.send(
          '맵 만들기를 시작해보죠. 자, 월드의 크기는 어떻습니까? `너비 x 높이` 형식으로 적어주세요. (곱했을 때 200이 넘어가면 안됩니다!)'
        )

        const returnMessage = await getMessageInPromise(
          this,
          (message) => message.author.id === user.id,
          30000
        )

        if (returnMessage === undefined) {
          message.channel.send(
            '시간 초과! 다시 생성 하고 싶으시다면 다시 명령해주십시오.'
          )
          return
        }

        const worldSize = returnMessage.content

        const [width, height] = worldSize
          .split('x')
          .map((size) => parseInt(size))

        if (isNaN(width) || isNaN(height)) {
          message.channel.send('숫자가 아닌것이 왔어요! 다시 해봅시다.')
          return await getWorldSize()
        }

        if (width * height > 200) {
          message.channel.send('월드 프롭이 200개가 넘어요! 좀 더 작게 해봐요.')
          return await getWorldSize()
        }

        return [width, height]
      }

      const size = await getWorldSize()
      if (size === undefined) {
        return
      }

      const [width, height] = size

      let worldTemplate: string = ''
      for (let l = 0; l < height; l++) {
        let row: string[] = []
        for (let i = 0; i < width; i++) {
          row.push('⬛')
        }
        worldTemplate += `${row.join(',')}\n`
      }

      message.channel.send(
        `월드 템플릿을 생성했습니다! 밑에 있는 양식을 복사하여 수정 후 보내주세요.\n어떤 프롭들이 있는지 궁금하시면, \`!props\`를 입력하면 알려드리겠습니다!\n그리고 디스코드에서 너무 길다며 파일로 보내려 하면, 나눠서 복사 붙여넣기를 하면 됩니다!\n\n${worldTemplate}`
      )

      const getWorld = async (): Promise<WorldGenerator | undefined> => {
        const worldMessage = await getMessageInPromise(
          this,
          (message) => message.author.id === user.id,
          3600000
        )
        if (worldMessage === undefined) {
          message.channel.send(
            '시간 초과! 다시 생성 하고 싶으시다면 다시 명령해주십시오.'
          )
          return
        }

        const customWorld: PropTypes[][] = []
        const props: Array<Door | Button | CubeDropper> = []
        const portals: Portals = {
          blue: null,
          orange: null
        }
        let playerPosition: Position | null = null
        let goalExist = false

        let content = worldMessage.content
        if (content === '!props') {
          message.channel.send(
            `⬛: 아무것도 없음
⬜: 월석 벽
🟫: 벽
🟠: 주황 포탈
🔵: 파랑 포탈
🟥: 큐브 버튼
🟩: 활성화된 큐브 버튼
🔴: 버튼
🟢: 활성화된 버튼
🟦: 큐브
🔷: 포탈 청소 필드
🧑: 플레이어
🔒: 문
🔓: 열린 문
🟪: 독극물
✅: 도착 지점`
          )
          return await getWorld()
        }

        const splited = content.split('\n')
        if (splited.length !== height) {
          message.channel.send(
            '월드가 설정된 값 보다 작거나 큽니다! 수정 후 다시 보내주세요.'
          )
          return await getWorld()
        }
        for (let l = 0; l < splited.length; l++) {
          const propLine = splited[l].split(',')
          if (propLine.length !== width) {
            message.channel.send(
              '월드가 설정된 값 보다 작거나 큽니다! 수정 후 다시 보내주세요.'
            )
            return await getWorld()
          }

          const row = []
          for (let i = 0; i < propLine.length; i++) {
            const prop = propLine[i].trim()
            const temp = PropEmoji.findIndex((emoji) => emoji === prop.trim())

            if (temp === -1) {
              message.channel.send(
                '프롭 리스트에 없는 프롭이 감지되었습니다! 수정 후 다시 보내주세요.'
              )
              return await getWorld()
            }

            const propType: PropTypes = temp
            if (AllButtonProps.includes(propType)) {
              props.push({
                type: 'button',
                activate: null,
                activated: ActivatedButtonProps.includes(propType),
                cube: CubeButtonProps.includes(propType),
                position: {
                  x: i,
                  y: l
                }
              })
              row.push(PropTypes.NONE)
            } else if (AllDoorProps.includes(propType)) {
              props.push({
                type: 'door',
                activated: propType === PropTypes.OPENED_DOOR,
                position: {
                  x: i,
                  y: l
                }
              })
              row.push(PropTypes.NONE)
            } else if (propType === PropTypes.BLUE_PORTAL) {
              if (portals.blue !== null) {
                message.channel.send(
                  '주황 포탈이 여러 개 발견되었습니다! 수정 후 다시 보내주세요.'
                )
                return await getWorld()
              } else {
                portals.blue = {
                  x: i,
                  y: l
                }
              }
              row.push(PropTypes.NONE)
            } else if (propType === PropTypes.ORANGE_PORTAL) {
              if (portals.orange !== null) {
                message.channel.send(
                  '주황 포탈이 여러 개 발견되었습니다! 수정 후 다시 보내주세요.'
                )
                return await getWorld()
              } else {
                portals.orange = {
                  x: i,
                  y: l
                }
              }
              row.push(PropTypes.NONE)
            } else if (propType === PropTypes.PLAYER) {
              playerPosition = {
                x: i,
                y: l
              }
              row.push(PropTypes.NONE)
            } else {
              row.push(propType)
            }

            if (propType === PropTypes.GOAL) {
              goalExist = true
            }
          }

          customWorld.push(row)
        }

        if (playerPosition === null) {
          message.channel.send(
            '플레이어가 월드에 없습니다! 수정 후 다시 보내주세요.'
          )
          return await getWorld()
        }

        if (!goalExist) {
          message.channel.send(
            '플레이어가 월드에 없습니다! 수정 후 다시 보내주세요.'
          )
          return await getWorld()
        }

        return {
          world: {
            size: {
              width,
              height
            },
            field: customWorld
          },
          props,
          portals,
          playerPosition
        }
      }

      const testWorld = await getWorld()
      if (testWorld === undefined) {
        return
      }

      const { world, props, portals, playerPosition } = testWorld

      message.channel.send('월드 인식이 끝났습니다!')
      if (props.length !== 0) {
        message.channel.send('버튼 설정이 남아있군요. 한번 설정해볼까요?')

        const buttonSetting = async (
          prop: Button
        ): Promise<Button | undefined> => {
          let loop = true
          while (loop) {
            const target =
              prop.activate === null
                ? null
                : props.find(
                    (p) =>
                      p.position.x === prop.activate?.x &&
                      p.position.y === prop.activate?.y
                  )
            message.channel.send(
              `버튼 (${prop.position.x}, ${prop.position.y})
  1. 활성화 하는 것: ${
    target === null
      ? '없음'
      : target === undefined
      ? '찾을 수 없음'
      : `${translatePerType[target.type]} (${target.position.x}, ${
          target.position.y
        })`
  }
  2. 활성화 여부: ${prop.activated ? 'O' : 'X'}
  3. 큐브 버튼 여부: ${prop.cube ? 'O' : 'X'}
  4. 타이머(ms): ${prop.timer !== undefined ? prop.timer : '영구적'}
  5. 위치: (${prop.position.x}, ${prop.position.y})`
            )
            message.channel.send(
              '변경하고 싶은 설정의 번호를 골라 입력해주세요.\n변경이 끝났다면, `s` 또는 `save`를 입력해주세요.'
            )

            const propSetting = await getMessageInPromise(
              this,
              (message) => message.author.id === user.id,
              3600000
            )
            if (propSetting === undefined) {
              message.channel.send(
                '시간 초과! 다시 생성 하고 싶으시다면 다시 명령해주십시오.'
              )
              return
            }

            const readSettings = async (): Promise<boolean | undefined> => {
              switch (propSetting.content.toLowerCase()) {
                case '1': {
                  message.channel.send(
                    '활성화 할 것의 좌표를 `x, y` 형식으로 입력해주세요.'
                  )
                  const setting = await getMessageInPromise(
                    this,
                    (message) => message.author.id === user.id,
                    3600000
                  )
                  if (setting === undefined) {
                    message.channel.send(
                      '시간 초과! 다시 생성 하고 싶으시다면 다시 명령해주십시오.'
                    )
                    return
                  }

                  const [x, y] = setting.content
                    .split(',')
                    .map((s) => parseInt(s))

                  if (isNaN(x) || isNaN(y)) {
                    message.channel.send(
                      '숫자가 아닌것이 왔어요! 다시 입력해주세요.'
                    )
                    return await readSettings()
                  }

                  if (
                    props.find(
                      (p) => p.position.x === x && p.position.y === y
                    ) === undefined
                  ) {
                    message.channel.send(
                      '활성화가 가능한 프롭이 아니에요! 다시 입력해주세요.'
                    )
                    return await readSettings()
                  }

                  prop.activate = {
                    x,
                    y
                  }

                  return false
                }
                case '2': {
                  message.channel.send(
                    '활성화 여부를 `O` 또는 `X`로 입력해주세요.'
                  )
                  const setting = await getMessageInPromise(
                    this,
                    (message) => message.author.id === user.id,
                    3600000
                  )
                  if (setting === undefined) {
                    message.channel.send(
                      '시간 초과! 다시 생성 하고 싶으시다면 다시 명령해주십시오.'
                    )
                    return
                  }

                  if (!['o', 'x'].includes(setting.content.toLowerCase())) {
                    message.channel.send(
                      '잘못된 값이 들어왔어요! 다시 입력해주세요.'
                    )
                    return await readSettings()
                  }

                  prop.activated = setting.content.toLowerCase() === 'o'
                  return false
                }
                case '3': {
                  message.channel.send(
                    '큐브 버튼 여부를 `O` 또는 `X`로 입력해주세요.'
                  )
                  const setting = await getMessageInPromise(
                    this,
                    (message) => message.author.id === user.id,
                    3600000
                  )
                  if (setting === undefined) {
                    message.channel.send(
                      '시간 초과! 다시 생성 하고 싶으시다면 다시 명령해주십시오.'
                    )
                    return
                  }

                  if (!['o', 'x'].includes(setting.content.toLowerCase())) {
                    message.channel.send(
                      '잘못된 값이 들어왔어요! 다시 입력해주세요.'
                    )
                    return await readSettings()
                  }

                  prop.cube = setting.content.toLowerCase() === 'o'
                  return false
                }
                case '4': {
                  message.channel.send('초를 숫자로만 ms 기준으로 적어주세요.')
                  const setting = await getMessageInPromise(
                    this,
                    (message) => message.author.id === user.id,
                    3600000
                  )
                  if (setting === undefined) {
                    message.channel.send(
                      '시간 초과! 다시 생성 하고 싶으시다면 다시 명령해주십시오.'
                    )
                    return
                  }

                  const time = parseInt(setting.content)

                  if (isNaN(time)) {
                    message.channel.send(
                      '숫자가 아닌것이 왔어요! 다시 입력해주세요.'
                    )
                    return await readSettings()
                  }

                  prop.timer = time

                  return false
                }
                case '5': {
                  message.channel.send('좌표를 `x, y` 형식으로 입력해주세요.')
                  const setting = await getMessageInPromise(
                    this,
                    (message) => message.author.id === user.id,
                    3600000
                  )
                  if (setting === undefined) {
                    message.channel.send(
                      '시간 초과! 다시 생성 하고 싶으시다면 다시 명령해주십시오.'
                    )
                    return
                  }

                  const [x, y] = setting.content
                    .split(',')
                    .map((s) => parseInt(s))

                  if (isNaN(x) || isNaN(y)) {
                    message.channel.send(
                      '숫자가 아닌것이 왔어요! 다시 입력해주세요.'
                    )
                    return await readSettings()
                  }

                  if (
                    world.field[y] === undefined ||
                    world.field[y][x] !== PropTypes.NONE ||
                    props.find(
                      (p) => p.position.x === x && p.position.y === y
                    ) !== undefined
                  ) {
                    message.channel.send(
                      '설치가 가능한 좌표가 아니에요! 다시 입력해주세요.'
                    )
                    return await readSettings()
                  }

                  prop.position = {
                    x,
                    y
                  }
                  return false
                }
                case 's':
                case 'save': {
                  message.channel.send('저장 중...')
                  return true
                }
                default: {
                  message.channel.send(
                    '잘못된 값이 들어왔어요! 다시 입력해주세요.'
                  )
                  return false
                }
              }
            }

            const result = await readSettings()

            if (result === undefined) {
              loop = false
              return
            } else {
              loop = !result
            }
          }

          return prop
        }

        for (let i = 0; i < props.length; i++) {
          const prop = props[i]
          if (prop.type !== 'button') continue

          const result = await buttonSetting(prop)

          if (result === undefined) return

          props[i] = result
        }
      }

      message.channel.send('이제 거의 다 끝났습니다!')
      const getPlayerPortalgun = async (): Promise<
        PortalgunStates | undefined
      > => {
        message.channel.send(
          '플레이어의 포탈건 모드를 숫자로 입력해주세요.\n\n1. 없음\n2. 파란 포탈만\n3. 주황 포탈만\n4. 모두'
        )
        const positionSetting = await getMessageInPromise(
          this,
          (message) => message.author.id === user.id,
          3600000
        )
        if (positionSetting === undefined) {
          message.channel.send(
            '시간 초과! 다시 생성 하고 싶으시다면 다시 명령해주십시오.'
          )
          return
        }

        const mode = parseInt(positionSetting.content)

        if (isNaN(mode) || mode < 1 || mode > 4) {
          message.channel.send('잘못된 값이 왔어요! 다시 입력해주세요.')
          return await getPlayerPortalgun()
        }

        return mode - 1
      }

      const portalgunMode = await getPlayerPortalgun()
      if (portalgunMode === undefined) return

      message.channel.send('마지막 단계입니다!')
      const getPlayerHealth = async (): Promise<number | undefined> => {
        message.channel.send('플레이어의 체력을 숫자로만 입력해주세요.')
        const positionSetting = await getMessageInPromise(
          this,
          (message) => message.author.id === user.id,
          3600000
        )
        if (positionSetting === undefined) {
          message.channel.send(
            '시간 초과! 다시 생성 하고 싶으시다면 다시 명령해주십시오.'
          )
          return
        }

        const health = parseInt(positionSetting.content)

        if (isNaN(health)) {
          message.channel.send('잘못된 값이 왔어요! 다시 입력해주세요.')
          return await getPlayerHealth()
        }

        return health
      }

      const playerHealth = await getPlayerHealth()
      if (playerHealth === undefined) return

      message.channel.send('저장 중...')
      const lastSavedID = worldDatas.lastSavedID

      worldDatas.worlds[(lastSavedID + 1).toString()] = {
        world,
        portals,
        props,
        player: {
          position: playerPosition,
          portalgun: portalgunMode,
          health: playerHealth,
          holding: false
        },
        id: lastSavedID + 1
      }

      worldDatas.lastSavedID = lastSavedID + 1

      const encoder = new TextEncoder()
      Deno.writeFileSync(
        '../maps.json',
        encoder.encode(JSON.stringify(worldDatas, null, 2))
      )

      message.channel.send(`완료! 월드 ID: ${lastSavedID + 1}`)
    } else if (message.content === '!help') {
      message.channel.send(
        new Embed({
          title: 'Portal: The Discord Version 도움말',
          fields: [
            {
              name: '!play <맵 ID>',
              value: '<맵 ID>을 플레이 하는 커맨드'
            },
            {
              name: '!make',
              value: '맵 만드는 커맨드'
            }
          ]
        })
      )
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

      reaction.message.delete()
      reaction.message.channel.send('게임이 끝났습니다.')
      return
    }

    if (reaction.emoji.name === '🔘' && !game.player.holding) {
      game.toggleUse()
      if (game.player.holding) {
        reaction.message.removeReaction(reaction.emoji.name)
        reaction.message.addReaction('🔻')
      }
      reaction.message.removeReaction(reaction.emoji.name, user)
      const embed = embedMaker(game)
      reaction.message.edit(embed)
      return
    }

    if (reaction.emoji.name === '🔻' && game.player.holding) {
      game.waitingForDropDirection = true
      return
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
      game.waitingForDropDirection &&
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

      game.drop(direction)
      if (!game.player.holding) {
        reaction.message.removeReaction('🔻', user)
        reaction.message.removeReaction('🔻')

        reaction.message.addReaction('🔘')
      }

      const embed = embedMaker(game)
      reaction.message.edit(embed)
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

    if (reaction.emoji.name === '🔻' && game.waitingForDropDirection) {
      game.waitingForDropDirection = false
      return
    }
  }
}

const bot = new Portal()
bot.connect(DISCORD_TOKEN, Intents.None)
