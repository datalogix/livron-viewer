import { Plugin } from '../plugin'
import { InteractionLayerBuilder } from './interaction-layer-builder'

export class InteractionPlugin extends Plugin {
  protected init() {
    this.viewer.addLayerBuilder(InteractionLayerBuilder)
  }

  protected destroy() {
    this.viewer.removeLayerBuilder(InteractionLayerBuilder)
  }
}
