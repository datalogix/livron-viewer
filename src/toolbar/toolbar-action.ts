import { createElement } from '@/utils'
import { ToolbarItem } from './toolbar-item'

export abstract class ToolbarAction extends ToolbarItem {
  protected button?: HTMLButtonElement
  protected onClickListener = this.onClick.bind(this)

  protected abstract execute(): Promise<void> | void

  async initialize(enabled?: boolean) {
    if (this.initialized) return

    this.button = createElement('button', {
      type: 'button',
      innerHTML: `<span>${this.constructor.name.toLowerCase()}</span>`,
    })

    this.container.classList.add('toolbar-action')
    this.container.appendChild(this.button)
    this.disable()

    await super.initialize(enabled)
  }

  async terminate() {
    if (!this.initialized) return

    this.disable()

    this.button?.remove()
    this.button = undefined

    await super.terminate()
  }

  protected onInit(enabled?: boolean): Promise<void> | void {
    this.toggle(enabled)
    this.markAsActivated()
  }

  get enabled() {
    return false
  }

  get activated() {
    return false
  }

  enable() {
    if (!this.button) return

    this.button.addEventListener('click', this.onClickListener)
    this.button.disabled = false
  }

  disable() {
    if (!this.button) return

    this.button.removeEventListener('click', this.onClickListener)
    this.button.disabled = true
  }

  toggle(value = this.enabled) {
    if (value) {
      this.enable()
    } else {
      this.disable()
    }
  }

  protected markAsActivated(value = this.activated) {
    if (value) {
      this.button?.classList.add('active')
    } else {
      this.button?.classList.remove('active')
    }
  }

  protected async onClick() {
    return this.execute()
  }
}
