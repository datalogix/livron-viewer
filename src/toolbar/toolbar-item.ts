import { Dispatcher } from '@/bus'
import { createElement } from '@/utils'
import type { Toolbar } from './toolbar'

export type ToolbarItemType = ToolbarItem | (new () => ToolbarItem)

export abstract class ToolbarItem extends Dispatcher {
  protected container = createElement('div', ['toolbar-item', this.className])
  private _toolbar?: Toolbar
  protected initialized = false
  protected abortController?: AbortController

  get name() {
    return this.constructor.name.toLowerCase()
  }

  get className() {
    return `toolbar-item-${this.name}`
  }

  get toolbar() {
    return this._toolbar!
  }

  get viewer() {
    return this.toolbar.viewer!
  }

  get eventBus() {
    return this.viewer.eventBus
  }

  get signal() {
    return this.abortController?.signal
  }

  setToolbar(toolbar: Toolbar) {
    this._toolbar = toolbar
  }

  async initialize(enabled?: boolean) {
    if (this.initialized) return

    this.initialized = true
    this.abortController = new AbortController()
    this.show()

    await this.init()

    this.dispatch(`toolbaritem${this.name}init`)
    this.on('documentinit', () => this.onInit(enabled))

    if (enabled) {
      queueMicrotask(() => this.onInit(enabled))
    }
  }

  async terminate() {
    if (!this.initialized) return

    this.initialized = false
    this.hide()

    await this.destroy()

    this.dispatch(`toolbaritem${this.name}destroy`)

    this.abortController?.abort()
    this.abortController = undefined
    // this.container.remove()
  }

  protected onInit(_enabled?: boolean): Promise<void> | void {

  }

  protected init(): Promise<void> | void {
    //
  }

  protected destroy(): Promise<void> | void {
    //
  }

  hide() {
    this.container.hidden = true
    this.container.classList.add('hidden')
  }

  show() {
    this.container.hidden = false
    this.container.classList.remove('hidden')
  }

  render() {
    return this.container
  }
}