import { Plugin, type ToolbarItemType } from '../plugin'
import { LibraryToolbarItem } from './library-toolbar-item'
import type { Book } from './types'

export class LibraryPlugin extends Plugin {
  protected getToolbarItems() {
    return new Map<string, ToolbarItemType>([
      ['library', LibraryToolbarItem],
    ])
  }

  private _books: Book[] = []
  private _book?: Book

  get books() {
    return this._books
  }

  set books(books) {
    this._books = books
  }

  get book() {
    return this._book
  }

  open(book: Book) {
    if (this.book?.id === book.id) {
      return
    }

    this._book = book

    this.dispatch('interactionload', { interactions: book.interactions })

    return this.viewer.openDocument(book.src)
  }
}
