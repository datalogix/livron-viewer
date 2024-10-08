import { LayerBuilder } from '@/viewer'
import { Plugin } from '../plugin'
import { TextAccessibilityLayerBuilder } from './text-accessibility-layer-builder'

export class TextAccessibilityPlugin extends Plugin {
  protected getAccessibilityManager(layerBuilder: LayerBuilder) {
    return (layerBuilder as LayerBuilder)
      .findLayer<TextAccessibilityLayerBuilder>(TextAccessibilityLayerBuilder)?.textAccessibilityManager
  }

  protected init() {
    this.on('textlayerbuildercancel', ({ source }) => this.getAccessibilityManager(source)?.disable())
    this.on('textlayerbuilderrender', ({ source }) => {
      const textAccessibilityManager = this.getAccessibilityManager(source)
      textAccessibilityManager?.setTextMapping(source.textLayer.textDivs)
      queueMicrotask(() => textAccessibilityManager?.enable())
    })

    this.viewer.addLayerBuilder(TextAccessibilityLayerBuilder)
  }

  protected destroy() {
    this.viewer.removeLayerBuilder(TextAccessibilityLayerBuilder)
  }
}
