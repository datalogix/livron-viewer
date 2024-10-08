import type { Book } from '@/index'
import { ToolbarActionToggle } from '@/toolbar'
import { Modal } from '@/tools'
import { createElement, waitOnEventOrTimeout } from '@/utils'
import { LibraryPlugin } from './library-plugin'

export class LibraryToolbar extends ToolbarActionToggle {
  protected persist = false

  get library() {
    return this.viewer.getLayerProperty<LibraryPlugin>('libraryplugin')
  }

  init() {
    if (!this.library?.books.length) {
      this.terminate()
      return
    }

    this.on('documentempty', () => this.openPersist())

    waitOnEventOrTimeout(this.eventBus, 'documentload', 250).then((type) => {
      if (type === 'timeout') {
        this.openPersist()
      }
    })
  }

  openPersist() {
    this.persist = true
    this.execute()
    this.persist = false
  }

  open() {
    const content = createElement('div', 'books')
    this.library?.books.forEach(book => content.appendChild(this.item(book)))

    Modal.open(content, {
      title: 'Library',
      backdrop: 'overlay',
      persist: this.persist,
      onClose: () => this.execute(),
    }).classList.add('library')
  }

  close() {
    Modal.close()
  }

  private item(book: Book) {
    const a = createElement('a', 'book')
    const info = createElement('div', 'info')
    const ul = createElement('ul')

    if (book.pagesCount) ul.append(createElement('li', { innerHTML: `Número de páginas: <b>${book.pagesCount}</b>` }))
    if (book.sku) ul.append(createElement('li', { innerHTML: `SKU: <b>${book.sku}</b>` }))
    if (book.author) ul.append(createElement('li', { innerHTML: `Autor: <b>${book.author}</b>` }))

    info.appendChild(createElement('h2', { innerText: book.name }))
    info.appendChild(ul)

    a.appendChild(book.cover ? createElement('img', { src: book.cover }) : createElement('i'))
    a.appendChild(info)
    a.addEventListener('click', () => {
      this.close()
      this.library?.open(book)
    })

    return a
  }
}
