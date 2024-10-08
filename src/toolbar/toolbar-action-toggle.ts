import { ToolbarAction } from './toolbar-action'

export abstract class ToolbarActionToggle extends ToolbarAction {
  protected _opened = false

  get opened() {
    return this._opened
  }

  set opened(value) {
    this._opened = value
    this.markAsActivated()
  }

  get enabled() {
    return true
  }

  get activated() {
    return this._opened
  }

  async terminate() {
    if (!this.initialized) return

    this.close()

    await super.terminate()
  }

  abstract open(): void
  abstract close(): void

  protected execute() {
    this.opened = !this.opened

    if (this.opened) {
      this.open()
    } else {
      this.close()
    }
  }
}
