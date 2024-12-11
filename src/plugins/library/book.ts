export type Book = {
  [x: string]: any
  id: string | number
  name: string
  src: string
  cover?: string
  pages?: number
  sku?: string
  author?: string
  description?: string
}
