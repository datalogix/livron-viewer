import { DrawLayer } from '@/pdfjs'
import { LayerBuilder } from './layer-builder'

export class DrawLayerBuilder extends LayerBuilder {
  private _drawLayer?: DrawLayer

  get drawLayer() {
    return this._drawLayer
  }

  canRegister() {
    return !!this.layerProperties.annotationManager.annotationEditorUIManager
  }

  protected build() {
    if (this._drawLayer) return

    this._drawLayer = new DrawLayer({ pageIndex: this.id })
    this._drawLayer.setParent(this.canvasPage.canvasWrapper)
  }

  cancel() {
    super.cancel()

    this._drawLayer?.destroy()
    this._drawLayer = undefined
  }
}
