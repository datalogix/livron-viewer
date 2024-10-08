import { ToolbarActionToggle } from '@/toolbar'
import { Modal } from '@/tools'
import { createElement } from '@/utils'
import { LibraryPlugin } from './library-plugin'

export class InformationToolbar extends ToolbarActionToggle {
  get library() {
    return this.viewer.getLayerProperty<LibraryPlugin>('libraryplugin')
  }

  get enabled() {
    return !!this.library?.book
  }

  init() {
    if (!this.library?.books.length) {
      this.terminate()
      return
    }
  }

  open() {
    const book = this.library?.book

    if (!book) {
      return this.close()
    }

    const content = createElement('ul', 'information')
    content.appendChild(this.item('Nome do livro', book.name))

    if (book.pagesCount) content.appendChild(this.item('Número de páginas', book.pagesCount.toString()))
    if (book.sku) content.appendChild(this.item('SKU', book.sku))
    if (book.author) content.appendChild(this.item('Autor', book.author))
    if (book.description) content.appendChild(this.item('Descrição', book.description))

    Modal.open(content, {
      title: 'Information',
      backdrop: 'overlay',
      onClose: () => this.execute(),
    })
  }

  close() {
    Modal.close()
  }

  private item(title: string, value: string) {
    const li = createElement('li')
    li.appendChild(createElement('div', 'title', { innerText: title }))
    li.appendChild(createElement('div', 'description', { innerText: value }))
    return li
  }
}
