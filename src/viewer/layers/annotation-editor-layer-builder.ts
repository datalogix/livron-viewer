import { AnnotationEditorLayer, IL10n, type AnnotationEditorLayerOptions } from '@/pdfjs'
import { TextAccessibilityLayerBuilder } from '@/plugins'
import { AnnotationLayerBuilder } from './annotation-layer-builder'
import { DrawLayerBuilder } from './draw-layer-builder'
import { LayerBuilder } from './layer-builder'
import { TextLayerBuilder } from './text-layer-builder'

export class AnnotationEditorLayerBuilder extends LayerBuilder {
  private _annotationEditorLayer?: AnnotationEditorLayer

  get annotationEditorLayer() {
    return this._annotationEditorLayer
  }

  get annotationEditorUIManager() {
    return this.layerProperties.annotationManager.annotationEditorUIManager
  }

  canRegister() {
    return !!this.annotationEditorUIManager
  }

  async render() {
    if (this.cancelled) {
      return
    }

    const clonedViewport = this.viewport.clone({ dontFlip: true })

    if (this.div) {
      this._annotationEditorLayer?.update({ viewport: clonedViewport })
      this.updateLayerDimensions(clonedViewport)
      this.show()
      return
    }

    this.create('annotationEditorLayer', 3)
    this.hide()
    this.div!.dir = this.annotationEditorUIManager?.direction

    this._annotationEditorLayer = new AnnotationEditorLayer({
      div: this.div!,
      uiManager: this.annotationEditorUIManager,
      accessibilityManager: this.findLayer<TextAccessibilityLayerBuilder>(TextAccessibilityLayerBuilder)?.textAccessibilityManager as any,
      pageIndex: this.id - 1,
      annotationLayer: this.findLayer<AnnotationLayerBuilder>(AnnotationLayerBuilder)?.annotationLayer,
      textLayer: this.findLayer<TextLayerBuilder>(TextLayerBuilder)?.div,
      drawLayer: this.findLayer<DrawLayerBuilder>(DrawLayerBuilder)?.drawLayer,
      viewport: clonedViewport,
      // todo: l10n
      l10n: { get(str: string) { return str } } as any as IL10n,
    } as AnnotationEditorLayerOptions)

    this._annotationEditorLayer.render({
      viewport: clonedViewport,
    })

    this.show()
    this.dispatch('render')
  }

  cancel() {
    super.cancel()

    if (!this.div) return

    this._annotationEditorLayer?.destroy()
  }

  show() {
    if (this._annotationEditorLayer?.isInvisible) return

    super.show()
  }
}
