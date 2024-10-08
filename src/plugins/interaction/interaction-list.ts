import { ProgressBar } from '@/tools'
import { createElement } from '@/utils'
import { Interaction } from './interaction'
import { InteractionItem } from './interaction-item'

export class InteractionList {
  protected container = createElement('div', 'interactions')
  protected readonly progressBar = new ProgressBar(0)

  constructor(readonly interactions: Interaction[] = []) {
    this.container.appendChild(this.renderHeader())
    this.container.appendChild(this.renderList())
    this.update()
  }

  update() {
    this.progressBar.total = this.interactions.length
    this.progressBar.value = this.pending.length + this.inProgress.length

    const summaryValue = this.container.querySelector<HTMLSpanElement>('.interaction-summary-value')
    summaryValue!.innerText = `${this.progressBar.value} de ${this.progressBar.total}`
  }

  get pending() {
    return this.interactions.filter(interaction => interaction.status === 'pending')
  }

  get inProgress() {
    return this.interactions.filter(interaction => interaction.status === 'in-progress')
  }

  get completed() {
    return this.interactions.filter(interaction => interaction.status === 'completed')
  }

  protected renderHeader() {
    const header = createElement('header')
    header.appendChild(this.renderSummary())
    header.appendChild(this.progressBar.render())
    header.appendChild(this.renderFilter())
    return header
  }

  protected renderSummary() {
    const summary = createElement('div', 'interaction-summary')
    summary.appendChild(createElement('span', 'interaction-summary-title', { innerText: 'Interações' }))
    summary.appendChild(createElement('span', 'interaction-summary-value'))
    return summary
  }

  protected renderFilter() {
    const filter = createElement('label', 'interaction-filter')
    const input = createElement('input', [], { type: 'checkbox' })
    const span = createElement('span', [], { innerText: 'Apenas não finalizadas' })

    filter.appendChild(input)
    filter.appendChild(span)

    return filter
  }

  protected renderList() {
    const ul = createElement('ul', 'interaction-list')

    this.interactions.forEach((interaction) => {
      const item = new InteractionItem(interaction)
      const li = createElement('li')
      li.appendChild(item.render())
      ul.appendChild(li)
    })

    return ul
  }

  render() {
    return this.container
  }
}
