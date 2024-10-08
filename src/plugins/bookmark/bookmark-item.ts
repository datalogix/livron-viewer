import { createElement } from '@/utils'
import { Bookmark } from './bookmark'

export class BookmarkItem {
  protected container = createElement('div', 'bookmark')

  constructor(readonly bookmark: Bookmark) {
    const deleteButton = createElement('button', 'bookmark-delete', { type: 'button' })
    deleteButton.addEventListener('click', this.onDelete.bind(this))

    const content = createElement('button', 'bookmark-content', { type: 'button' })
    content.appendChild(createElement('span', 'bookmark-page', { innerText: `Page ${bookmark.page}` }))

    if (bookmark.description) {
      content.appendChild(createElement('span', 'bookmark-description', { innerText: bookmark.description }))
    }

    content.addEventListener('click', this.onClick.bind(this))

    this.container.appendChild(content)
    this.container.appendChild(deleteButton)
  }

  protected onClick(event: MouseEvent) {
    console.log('TODO: onClick', event)
  }

  protected onDelete(event: MouseEvent) {
    event.preventDefault()
    console.log('TODO: onDelete', event)
  }

  render() {
    return this.container
  }
}
