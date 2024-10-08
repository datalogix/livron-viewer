import { ToolbarItem } from '@/toolbar'
import { createElement, preventDefault } from '@/utils'

export class ZoomSelect extends ToolbarItem {
  protected select?: HTMLSelectElement
  protected onChangeListener = this.onChange.bind(this)
  protected customOption = createElement('option', {
    hidden: true,
    disabled: true,
    text: '0%',
    value: 'custom',
  })

  protected onInit() {
    this.selectOption()
    this.enable()
  }

  protected init() {
    this.select = createElement('select', { oncontextmenu: preventDefault() })
    this.container.appendChild(this.select)
    this.disable()
    this.createOptions()

    this.on('scalechanging', () => this.selectOption())
  }

  protected destroy() {
    this.disable()
    this.select?.remove()
    this.select = undefined
  }

  private createOptions() {
    while (this.select?.options.length) {
      this.select?.options.remove(0)
    }

    const options: Map<string, string> = new Map([
      ['Zoom automático', 'auto'],
      ['Tamanho real', 'page-actual'],
      ['Ajustar à janela', 'page-fit'],
      ['Largura da página', 'page-width'],
      ['50%', '0.5'],
      ['75%', '0.75'],
      ['100%', '1'],
      ['125%', '1.25'],
      ['150%', '1.5'],
      ['200%', '2'],
      ['300%', '3'],
      ['400%', '4'],
    ])

    options.forEach((value, text) => this.select?.options.add(createElement('option', { value, text })))

    this.select?.options.add(this.customOption)
  }

  private selectOption() {
    let predefinedValueFound = false

    for (const option of Array.from(this.select?.options ?? [])) {
      if (option.value !== (this.viewer.currentScaleValue || this.viewer.currentScale).toString()) {
        option.selected = false
        continue
      }

      option.selected = true
      predefinedValueFound = true
    }

    if (!predefinedValueFound) {
      this.customOption.selected = true
      this.customOption.text = `${(Math.round(this.viewer.currentScale * 10000) / 100)}%`
    }
  }

  enable() {
    if (!this.select) return

    this.select.addEventListener('change', this.onChangeListener)
    this.select.disabled = false
  }

  disable() {
    if (!this.select) return

    this.select.removeEventListener('change', this.onChangeListener)
    this.select.disabled = true
  }

  protected onChange(_event: Event) {
    const value = this.select?.value

    if (value !== 'custom' && value !== undefined) {
      this.viewer.currentScaleValue = value
    }
  }
}
