import type { Book } from '@/index'
import type { ToolbarItemType } from '@/toolbar'
import { Plugin } from '../plugin'
import { LibraryToolbar } from './library-toolbar'
import { InformationToolbar } from './information-toolbar'

export class LibraryPlugin extends Plugin {
  protected getToolbarItems() {
    return new Map<string, ToolbarItemType>([
      ['library', LibraryToolbar],
      ['information', InformationToolbar],
    ])
  }

  protected init() {
    this.on('toolbaritemmenuinit', ({ source: menu }) => {
      menu.add(new InformationToolbar(), 0, 0)
    })
  }

  private _book?: Book

  get book() {
    return this._book
  }

  get books() {
    return [
      {
        id: '1',
        name: 'Livro 1',
        src: './file.pdf',
        cover: 'https://tailwindcss.com/_next/static/media/death-blow.bcfcabb1.jpg',
      },
      {
        id: '2',
        name: 'Livro 2',
        src: './_file.pdf',
        cover: 'https://tailwindcss.com/_next/static/media/rochelle-rochelle.b97e372a.jpg',
      },
    ] as Book[]
  }

  open(book: Book) {
    if (this.book?.id === book.id) {
      return
    }

    this._book = book
    this.viewer.loadDocument(book.src)
  }
}
