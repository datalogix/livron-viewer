import { SidebarItem } from '@/toolbar'
import { InteractionList } from './interaction-list'

export class InteractionSidebar extends SidebarItem {
  build() {
    const items = new InteractionList([
      {
        id: 1,
        page: 1,
        type: 'audio',
        x: 1,
        y: 1,
        content: '',
        status: 'pending',
      },
      {
        id: 2,
        page: 2,
        type: 'video',
        x: 2,
        y: 2,
        content: '',
        status: 'in-progress',
      },
      {
        id: 3,
        page: 3,
        type: 'question',
        x: 3,
        y: 3,
        content: '',
        status: 'completed',
      },
    ])

    return items.render()
  }
}
