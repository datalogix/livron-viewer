import { createElement, debounce } from '@/utils'
import { ToolbarItem } from '@/toolbar'

export class InputPage extends ToolbarItem {
  protected input?: HTMLInputElement
  protected total?: HTMLSpanElement
  protected onKeyDownListener = this.onKeyDown.bind(this)
  protected onKeyUpListener = debounce(this.onKeyUp.bind(this))

  protected onInit() {
    if (!this.input || !this.total) return

    this.input.max = this.viewer.pagesCount.toString()
    this.input.value = this.viewer.currentPageNumber.toString()
    this.total.innerText = ` de ${this.input.max}`
    this.enable()
  }

  protected init() {
    this.input = createElement('input', { type: 'number', min: '1' })
    this.container.appendChild(this.input)

    this.total = createElement('span')
    this.container.appendChild(this.total)

    this.disable()

    this.on('pagechanging', () => {
      if (!this.input) return

      this.input.value = this.viewer.currentPageNumber.toString()
    })
  }

  protected destroy() {
    this.disable()

    this.input?.remove()
    this.input = undefined

    this.total?.remove()
    this.total = undefined
  }

  enable() {
    if (!this.input) return

    this.input.addEventListener('keydown', this.onKeyDownListener)
    this.input.addEventListener('keyup', this.onKeyUpListener)
    this.input.disabled = false
  }

  disable() {
    if (!this.input) return

    this.input.removeEventListener('keydown', this.onKeyDownListener)
    this.input.removeEventListener('keyup', this.onKeyUpListener)
    this.input.disabled = true
  }

  protected onKeyDown(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'enter') {
      this.onKeyUp(event)
    }
  }

  protected onKeyUp(event: KeyboardEvent) {
    const input = event.target as HTMLInputElement
    let value = parseInt(input.value)
    const min = parseInt(input.min)
    const max = parseInt(input.max)

    if (value === this.viewer.currentPageNumber) {
      return
    }

    if (isNaN(value)) {
      input.value = this.viewer.currentPageNumber.toString()
      return
    }

    if (value < min) value = min
    if (value > max) value = max

    input.value = value.toString()
    this.viewer.currentPageNumber = value
  }
}