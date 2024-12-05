import { ToolbarActionToggle } from '@/toolbar'
import { Modal } from '@/tools'
import { createElement, waitOnEventOrTimeout } from '@/utils'
import { LibraryPlugin } from './library-plugin'
import type { Book } from './types'

export class LibraryToolbarItem extends ToolbarActionToggle {
  protected persist = false

  get library() {
    return this.viewer.getLayerProperty<LibraryPlugin>('LibraryPlugin')
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
      title: this.l10n.get('library.title'),
      backdrop: 'overlay',
      persist: this.persist,
      onClose: () => this.execute(),
    }).classList.add('library')
  }

  close() {
    Modal.close()
  }

  protected item(book: Book) {
    const button = createElement('button', 'book', { type: 'button' })
    const info = createElement('div', 'info')
    const ul = createElement('ul')

    if (book.sku) ul.append(createElement('li', { innerHTML: this.l10n.get('library.sku', { sku: book.sku }) }))
    if (book.pages) ul.append(createElement('li', { innerHTML: this.l10n.get('library.pages', { pages: book.pages }) }))
    if (book.interactions) ul.append(createElement('li', { innerHTML: this.l10n.get('library.interactions', { interactions: book.interactions.length }) }))
    if (book.author) ul.append(createElement('li', { innerHTML: this.l10n.get('library.author', { author: book.author }) }))
    if (book.description) ul.append(createElement('li', 'description', { innerHTML: book.description }))

    info.appendChild(createElement('h2', { innerText: book.name }))
    info.appendChild(ul)

    button.appendChild(book.cover ? createElement('img', { src: book.cover }) : createElement('i'))
    button.appendChild(info)
    button.addEventListener('click', () => {
      this.close()
      this.library?.open(book)
    })

    return button
  }
}
