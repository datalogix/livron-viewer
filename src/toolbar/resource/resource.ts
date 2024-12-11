import { ToolbarActionToggle } from '@/toolbar'
import { Modal } from '@/tools'
import { createElement } from '@/utils'

export type ResourceItem = {
  name: string
  src?: string
  items?: ResourceItem[]
}

export class Resource extends ToolbarActionToggle {
  protected resources: ResourceItem[] = []

  get enabled() {
    return this.resources.length > 0
  }

  protected init() {
    this.on('book', ({ book }) => {
      this.on('documentload', () => {
        this.dispatch('resourceload', { resources: book?.resources })
      })
    })

    this.on('documentdestroy', () => {
      this.resources = []
      this.toggle()
    })

    this.on('resourceload', ({ resources }) => {
      this.resources = resources ?? []
      this.toggle()
    })
  }

  open() {
    Modal.open(this.item(this.resources), {
      title: this.l10n.get('resource.title'),
      backdrop: 'overlay',
      onClose: () => this.execute(),
    }).classList.add('resource-modal')
  }

  close() {
    Modal.close()
  }

  protected item(items: ResourceItem[]) {
    const ul = createElement('ul')
    items.forEach((item) => {
      const li = createElement('li')
      if (item.src) {
        li.appendChild(createElement('a', {
          innerText: item.name,
          href: item.src,
          target: '_blank',
        }))
      } else if (item.items && item.items.length) {
        li.appendChild(createElement('button', {
          innerText: item.name,
          type: 'button',
        }))
        li.appendChild(this.item(item.items))
      }
      ul.appendChild(li)
    })
    return ul
  }
}
