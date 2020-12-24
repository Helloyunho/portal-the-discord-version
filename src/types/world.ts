import { PropTypes } from './other.ts'

export interface World {
  field: PropTypes[][]
  size: WorldSize
}
export interface WorldSize {
  width: number
  height: number
}
