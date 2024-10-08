import { ToolbarActionToggle } from '@/toolbar'
import { Drawer } from '@/tools'
import { createElement } from '@/utils'
import { SidebarItem } from './sidebar-item'

export class Sidebar extends ToolbarActionToggle {
  protected element = createElement('div', 'sidebar')
  protected menu = createElement('ul', 'sidebar-menu')
  protected items = new Map<string, SidebarItem>()
  protected current?: string
  protected drawer = new Drawer({
    backdrop: false,
    classes: 'sidebar-drawer',
    onClose: () => this.opened = false,
  })

  constructor(items = new Map<string, SidebarItem>()) {
    super()

    this.drawer.render(this.element)
    this.element.appendChild(this.menu)

    items.forEach((item, key) => this.add(key, item))
  }

  get enabled() {
    return this.items.size > 0
  }

  protected init() {
    this.on('sidebarchanged', ({ key }) => this.select(key))
  }

  protected async destroy() {
    for (const item of this.items.values()) {
      await item.terminate()
    }

    this.current = undefined
    this.items.clear()
    // this.element.remove()
  }

  find(item: SidebarItem): string[] {
    const keys: string[] = []

    this.items.forEach((value, key) => {
      if (item === value) {
        keys.push(key)
      }
    })

    return keys
  }

  add(key: string, item: SidebarItem) {
    this.items.set(key, item)

    item.setSidebar(this)

    const button = createElement('button', ['sidebar-item', `sidebar-item-${key}`])
    button.onclick = () => this.select(key)
    this.menu.appendChild(button)

    this.element.appendChild(item.render())
  }

  remove(item: SidebarItem) {
    this.find(item).forEach((key) => {
      const items = this.menu.getElementsByClassName(`sidebar-item-${key}`)

      while (items.length > 0) {
        items[0].remove()
      }

      this.items.delete(key)
    })

    this.current = undefined
    this.close()
  }

  select(key: string) {
    if (!this.items.has(key)) return

    this.element.querySelector('.sidebar-item.selected')?.classList.remove('selected')
    this.element.querySelector(`.sidebar-item-${key}`)?.classList.add('selected')

    if (this.current) {
      this.items.get(this.current)?.hide()
    }

    this.items.get(key)!.show()
    this.drawer.open()
    this.current = key
  }

  open() {
    if (this.current) {
      this.select(this.current)
      return
    }

    const first = this.items.keys().next().value

    if (first) {
      this.select(first)
    }
  }

  close() {
    this.drawer.close()

    if (this.current) {
      this.items.get(this.current)?.hide()
    }
  }
}
