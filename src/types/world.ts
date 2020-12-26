import { PropTypes } from './props.ts'

export interface World {
  field: PropTypes[][]
  size: WorldSize
}
export interface WorldSize {
  width: number
  height: number
}
