import { LayerBuilder } from '@/viewer'
import { createElement } from '@/utils'
import { Interaction } from './interaction'

export class InteractionLayerBuilder extends LayerBuilder {
  protected async build() {
    this.create('interactionLayer', 5)

    const interactions: Interaction[] = [
      {
        x: 100,
        y: 10,
        type: 'audio',
        content: 'https://www.w3schools.com/html/horse.mp3',
        status: 'pending',
        id: 2,
        page: 1,
      },
      {
        id: 1,
        page: 2,
        x: 200,
        y: 20,
        type: 'video',
        content: 'https://www.w3schools.com/html/mov_bbb.mp4',
        status: 'completed',
      },
    ]

    interactions.forEach((interaction) => {
      const button = createElement('button')
      button.classList.add('interaction', interaction.type.toLowerCase(), interaction.status || '')
      button.style.top = `calc(${interaction.y}px * var(--scale-factor))`
      button.style.left = `calc(${interaction.x}px * var(--scale-factor))`
      button.onclick = () => this.eventBus.dispatch('playeradd', { source: interaction.content })
      const status = createElement('span')
      status.classList.add('status')
      button.appendChild(status)
      this.div!.appendChild(button)
    })
  }
}
