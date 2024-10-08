import { LayerBuilder } from '@/viewer'
import { createElement } from '@/utils'

export class BookmarkLayerBuilder extends LayerBuilder {
  protected async build() {
    this.create('bookmarkLayer', -1)

    const button = createElement('button', 'bookmark', { type: 'button' })

    button.addEventListener('click', (_event: MouseEvent) => {
      const x = window.prompt(`Marcar página ${this.page.id}`)

      if (x !== null) {
        button.classList.add('selected')
      }

      this.eventBus.dispatch('bookmarkadd', { pageNumber: this.page.id })
    })

    this.div!.appendChild(button)
  }
}
