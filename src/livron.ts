import 'virtual:uno.css'
import '@unocss/reset/tailwind.css'
import './styles/viewer.css'

import { getResolvedPDFJS } from 'unpdf'
import { Api } from './api'
import { Viewer } from './viewer'
import type { User } from './types'

export class Livron {
  private viewer?: Viewer
  private api: Api

  constructor(
    bookId: string,
    apiKey?: string,
    user?: User
  ) {
    this.api = new Api(bookId, apiKey)

    if (user) {
      this.setUser(user)
    }
  }

  setUser(user: User) {
    this.api.setUser(user)
  }
  
  async render(elementId: string = 'app') {
    const book = await (await this.api.load()).arrayBuffer()

    this.viewer = new Viewer({
      container: document.getElementById(elementId) as HTMLDivElement,
    })

    this.stats()

    const { getDocument } = await getResolvedPDFJS()

    // @ts-ignore
    this.viewer.setDocument(await getDocument(book).promise)
  }

  private stats() {
    this.viewer?.eventBus.on('pagesinit', () => this.api.stats('book-viewed'))
    this.viewer?.eventBus.on('pagechanging', ({ pageNumber }) => this.api.stats('book-page-viewed', { pageNumber }))
  }
}