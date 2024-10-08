import { createElement } from '@/utils'
import { Bookmark } from './bookmark'
import { BookmarkItem } from './bookmark-item'

export class BookmarkList {
  protected container = createElement('div', 'bookmarks')

  constructor(readonly bookmarks: Bookmark[] = []) {
    this.container.appendChild(this.renderList())
  }

  renderList() {
    const ul = createElement('ul', 'bookmark-list')

    this.bookmarks.forEach((bookmark) => {
      const item = new BookmarkItem(bookmark)
      const li = createElement('li')
      li.appendChild(item.render())
      ul.appendChild(li)
    })

    return ul
  }

  render() {
    return this.container
  }
}
