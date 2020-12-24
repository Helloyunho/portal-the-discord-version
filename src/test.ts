const WIDTH = 20
const HEIGHT = 10

const WORLD = []

const getBEAUTIFULString = (world: EMOJI_TYPES[][]) => {
  return world.map((a) => a.join(',')).join('\n')
}

const PLAY_WORLD = []

for (let l = 0; l < HEIGHT + 2; l++) {
  const row = []
  for (let i = 0; i < WIDTH + 2; i++) {
    if (i === 2) {
      row.push(EMOJI_TYPES.WALL)
      continue
    }
    row.push(EMOJI_TYPES.NONE)
  }
  PLAY_WORLD.push(row)
}

const PLAYER_POS: PLAYER_POSITION = {
  x: 1,
  y: 1
}

PLAY_WORLD[PLAYER_POS.y][PLAYER_POS.x] = EMOJI_TYPES.PLAYER

const goTo = (
  world: EMOJI_TYPES[][],
  playWorld: EMOJI_TYPES[][],
  person: PLAYER_POSITION,
  direction: DIRECTIONS
) => {
  if (
    checkIfPlayerIsInTheWorld(playWorld, person) &&
    checkPlayerCanGoInThisDirection(playWorld, person, direction)
  ) {
    playWorld[person.y][person.x] = world[person.y][person.x]
    switch (direction) {
      case DIRECTIONS.UP:
        person.y = person.y - 1
        break
      case DIRECTIONS.DOWN:
        person.y = person.y + 1
        break
      case DIRECTIONS.LEFT:
        person.x = person.x - 1
        break
      case DIRECTIONS.RIGHT:
        person.x = person.x + 1
        break
      default:
        return
    }
    playWorld[person.y][person.x] = EMOJI_TYPES.PLAYER
  } else {
    console.log('Player cannot go to there.')
  }
}

// const shootBluePortal = (
//   world: EMOJI_TYPES[][],
//   playWorld: EMOJI_TYPES[][],
//   person: PLAYER_POSITION,
//   direction: DIRECTIONS
// )

console.log(getBEAUTIFULString(PLAY_WORLD))
console.log(checkIfPlayerIsInTheWorld(PLAY_WORLD, PLAYER_POS))
goTo(WORLD, PLAY_WORLD, PLAYER_POS, DIRECTIONS.UP)
goTo(WORLD, PLAY_WORLD, PLAYER_POS, DIRECTIONS.DOWN)
goTo(WORLD, PLAY_WORLD, PLAYER_POS, DIRECTIONS.RIGHT)
goTo(WORLD, PLAY_WORLD, PLAYER_POS, DIRECTIONS.LEFT)

console.log(getBEAUTIFULString(PLAY_WORLD))

export {}
