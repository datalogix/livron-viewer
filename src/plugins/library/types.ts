import { Interaction } from './interaction'

export type Book = {
  id: string | number
  name: string
  src: string
  cover?: string
  pages?: number
  sku?: string
  author?: string
  description?: string
  interactions?: Interaction[]
}
