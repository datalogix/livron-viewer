import { PresentationModeState } from '@/enums'
import { AnnotationLayer, AnnotationMode, type AnnotationLayerParameters } from '@/pdfjs'
import { TextAccessibilityLayerBuilder } from '@/plugins'
import { LayerBuilder } from './layer-builder'

export class AnnotationLayerBuilder extends LayerBuilder {
  private _annotationLayer?: AnnotationLayer

  get annotationLayer() {
    return this._annotationLayer
  }

  canRegister() {
    return this.options.annotationMode !== AnnotationMode.DISABLE
  }

  async render() {
    if (this.div) {
      if (this.cancelled || !this._annotationLayer) {
        return
      }

      this._annotationLayer.update({
        viewport: this.viewport.clone({ dontFlip: true }),
      } as AnnotationLayerParameters)

      return
    }

    const annotations = await this.pdfPage!.getAnnotations({ intent: 'display' })

    if (this.cancelled) {
      return
    }

    this.create('annotationLayer', 2)

    if (annotations.length === 0) {
      this.hide()
      return
    }

    this._annotationLayer = new AnnotationLayer({
      div: this.div,
      accessibilityManager: this.findLayer<TextAccessibilityLayerBuilder>(TextAccessibilityLayerBuilder)?.textAccessibilityManager,
      annotationCanvasMap: this.page.annotationCanvasMap,
      annotationEditorUIManager: this.layerProperties.annotationManager.annotationEditorUIManager,
      page: this.pdfPage,
      viewport: this.viewport.clone({ dontFlip: true }),
    })

    await this._annotationLayer.render({
      annotations,
      imageResourcesPath: this.options.imageResourcesPath,
      renderForms: this.layerProperties.annotationManager.renderForms,
      annotationStorage: this.layerProperties.documentManager.pdfDocument?.annotationStorage,
    } as AnnotationLayerParameters)

    if (this.layerProperties.presentationManager.isInPresentationMode) {
      this.updatePresentationModeState(PresentationModeState.FULLSCREEN)
    }

    if (!this.abortController) {
      this.abortController = new AbortController()
      this.on('presentationmodechanged', ({ state }) => this.updatePresentationModeState(state))
    }

    this.dispatch('render')
  }

  hasEditableAnnotations() {
    return !!this._annotationLayer?.hasEditableAnnotations()
  }

  private updatePresentationModeState(state: PresentationModeState) {
    this.div?.childNodes.forEach((section) => {
      if (!(section instanceof HTMLElement) || section.hasAttribute('data-internal-link')) {
        return
      }

      section.inert = PresentationModeState.FULLSCREEN === state
    })
  }
}
