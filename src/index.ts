import 'virtual:uno.css'
import '@unocss/reset/tailwind.css'
import './styles/index.scss'

export * from './api'
export * from './bus'
export * from './config'
export * from './enums'
export * from './pdfjs'
export * from './plugins'
export * from './toolbar'
export * from './tools'
export * from './utils'
export * from './viewer'

export * from './core'

export type Book = {
  id: string | number
  name: string
  src: string
  cover?: string
  pagesCount?: number
  sku?: string
  author?: string
  description?: string
  bookmarks?: Bookmark[]
  interactions?: Interaction[]
}

export type Bookmark = {
  id: string | number
  page: number
  description?: string
}

export type Interaction = {
  id: string | number
  title?: string
  page: number
  type: 'audio' | 'video' | 'question'
  x: number
  y: number
  content: string
  // status: 'pending' | 'in-progress' | 'completed'
}
