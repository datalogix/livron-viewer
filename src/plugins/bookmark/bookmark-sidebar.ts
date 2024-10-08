import { SidebarItem } from '@/toolbar'
import { BookmarkList } from './bookmark-list'

export class BookmarkSidebar extends SidebarItem {
  build() {
    const items = new BookmarkList([
      {
        id: 1,
        page: 1,
        description: '',
      },
      {
        id: 2,
        page: 2,
        description: 'Conteúdo 2<b>ds</b>',
      },
      {
        id: 3,
        page: 3,
        description: 'Conteúdo 3',
      },
    ])

    return items.render()
  }
}
