import { Plugin } from '../plugin'
import { InteractionLayerBuilder } from './interaction-layer-builder'
import { InteractionService } from './interaction-service'

export class InteractionPlugin extends Plugin {
  private _interactionService?: InteractionService

  get interactionService() {
    return this._interactionService
  }

  protected init() {
    this.viewer.addLayerBuilder(InteractionLayerBuilder)
    this._interactionService = new InteractionService(this.eventBus)

    this.on('pagesdestroy', () => this._interactionService?.destroy())
    this.on('interactionload', ({ interactions }) => this._interactionService?.load(interactions))
    this.on('interactionselect', ({ interaction }) => {
      this.setCurrentPage(interaction.page)
      this._interactionService?.open(interaction)
    })
  }

  protected destroy() {
    this.viewer.removeLayerBuilder(InteractionLayerBuilder)
    this._interactionService?.destroy()
    this._interactionService = undefined
  }
}
