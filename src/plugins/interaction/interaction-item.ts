import { createElement } from '@/utils'
import { Interaction } from './interaction'

export class InteractionItem {
  protected container = createElement('button', 'interaction', { type: 'button' })

  constructor(readonly interaction: Interaction) {
    this.container.classList.add(`interaction-type-${interaction.type}`, `interaction-status-${interaction.status}`)
    this.container.style.top = `calc(${this.interaction.y}px * var(--scale-factor))`
    this.container.style.left = `calc(${this.interaction.x}px * var(--scale-factor))`
    this.container.appendChild(createElement('i', 'interaction-icon'))
    this.container.appendChild(createElement('span', 'interaction-title', {
      innerText: `${this.interaction.title ? `${this.interaction.title} - ` : ''}Página ${this.interaction.page}`,
    }))
    this.container.appendChild(createElement('span', 'interaction-status'))
    this.container.addEventListener('click', this.onClick.bind(this))
  }

  protected onClick(event: MouseEvent) {
    console.log('TODO: click', event)
  }

  render() {
    return this.container
  }
}
