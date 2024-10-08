import { createElement } from '@/utils'
import { ToolbarActionToggle } from './toolbar-action-toggle'
import { ToolbarAction } from './toolbar-action'
import type { Toolbar } from './toolbar'

export type ToolbarMenuActions = (ToolbarAction | ToolbarAction[])[]

export class ToolbarMenu extends ToolbarActionToggle {
  protected onDocumentClickListener = this.execute.bind(this)
  protected menu?: HTMLDivElement

  constructor(readonly actions: ToolbarMenuActions) {
    super()
  }

  private matchActionByName(action: ToolbarAction, name: string): boolean {
    return action.constructor.name.toLowerCase() === name.toLowerCase()
  }

  add(action: ToolbarAction, index?: number, group?: number) {
    if (!action.toolbar) {
      action.setToolbar(this.toolbar)
    }

    if (index === undefined && group === undefined) {
      this.actions.push(action)
      return
    }

    if (group !== undefined) {
      if (!Array.isArray(this.actions[group])) {
        this.actions[group] = this.actions[group] ? [this.actions[group]] : []
      }

      if (index !== undefined) {
        this.actions[group].splice(index, 0, action)
      } else {
        this.actions[group].push(action)
      }

      return
    }

    if (index !== undefined) {
      this.actions.splice(index, 0, action)
    }
  }

  get(name: string) {
    return this.actions.flat().find(action => this.matchActionByName(action, name))
  }

  remove(name: string) {
    const removeRecursive = (actions: ToolbarMenuActions) => {
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i]

        if (Array.isArray(action)) {
          removeRecursive(action)
        } else if (this.matchActionByName(action, name)) {
          action.terminate()
          actions.splice(i, 1)
          return
        }
      }
    }

    removeRecursive(this.actions)
  }

  setToolbar(toolbar: Toolbar) {
    super.setToolbar(toolbar)

    this.actions.flat().forEach(action => action.setToolbar(toolbar))
  }

  async initialize(enabled?: boolean) {
    if (this.initialized) return

    await super.initialize(enabled)

    this.menu = createElement('div', 'toolbar-menu')
    this.container.appendChild(this.menu)

    await Promise.all(this.actions.flat().map(action => action.initialize(enabled)))

    this.actions.forEach((action) => {
      if (action instanceof ToolbarAction) {
        this.menu?.appendChild(action.render())
      } else if (Array.isArray(action) && action.length) {
        const group = createElement('div', 'toolbar-menu-group')
        action.forEach(a => group.appendChild(a.render()))
        this.menu?.appendChild(group)
      }
    })

    this.markAsActivated()
  }

  async terminate() {
    if (!this.initialized) return

    this.close()

    await Promise.all(this.actions.flat().map(action => action.terminate()))

    this.menu?.remove()
    this.menu = undefined

    await super.terminate()
  }

  open() {
    this.container.classList.add('toolbar-menu-open')
    setTimeout(() => this.container.ownerDocument.addEventListener('click', this.onDocumentClickListener), 0)
  }

  close() {
    this.container.classList.remove('toolbar-menu-open')
    this.container.ownerDocument.removeEventListener('click', this.onDocumentClickListener)
  }
}
