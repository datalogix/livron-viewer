import { createElement } from '@/utils'

export class ProgressBar {
  protected container = createElement('div', 'progress-bar')
  protected span = this.container.appendChild(createElement('span'))
  private _total
  private _value

  constructor(total: number, value = 0, container?: HTMLElement) {
    this._total = total
    this._value = value
    this.update()
    container?.appendChild(this.render())
  }

  get total() {
    return this._total
  }

  set total(n) {
    this._total = n
    this.update()
  }

  get value() {
    return this._value
  }

  set value(n) {
    this._value = n
    this.update()
  }

  get percentage() {
    return this._value > 0 ? this._value * 100 / this._total : 0
  }

  get percentageForHumans() {
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    })

    return `${formatter.format(this.percentage)} %`
  }

  private update() {
    const pct = this.percentage

    this.span.classList.remove('hidden')
    this.span.classList.remove('completed')

    if (pct === 0) this.span.classList.add('hidden')
    if (pct === 100) this.span.classList.add('completed')

    this.span.style.width = `${pct}%`
    this.span.innerText = this.percentageForHumans
  }

  render() {
    return this.container
  }
}