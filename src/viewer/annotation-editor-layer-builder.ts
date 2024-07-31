import { AnnotationEditorLayer } from './pdfjs'
import type { TextAccessibilityManager } from './text-accessibility-manager'
import type { TextLayerBuilder } from './text-layer-builder'
import type {
  PDFPageProxy,
  AnnotationLayer,
  PageViewport,
  AnnotationEditorUIManager,
  DrawLayer,
  IL10n,
} from './types'

export class AnnotationEditorLayerBuilder {
  public div?: HTMLDivElement
  private cancelled: boolean = false
  private annotationEditorLayer?: AnnotationEditorLayer

  constructor(public readonly options: {
    pdfPage: PDFPageProxy
    accessibilityManager?: TextAccessibilityManager
    l10n: IL10n
    uiManager: AnnotationEditorUIManager
    annotationLayer?: AnnotationLayer
    textLayer?: TextLayerBuilder
    drawLayer: DrawLayer
    onAppend?: (div: HTMLDivElement) => void
  }) { }

  render(viewport: PageViewport, intent = 'display') {
    if (intent !== 'display' || this.cancelled) {
      return
    }

    const clonedViewport = viewport.clone({ dontFlip: true })

    if (this.div) {
      this.annotationEditorLayer?.update({ viewport: clonedViewport })
      this.show()
      return
    }

    const div = this.div = document.createElement('div')
    div.className = 'annotationEditorLayer'
    div.hidden = true
    div.dir = this.options.uiManager.direction

    this.options.onAppend?.(div)

    this.annotationEditorLayer = new AnnotationEditorLayer({
      uiManager: this.options.uiManager,
      pageIndex: this.options.pdfPage.pageNumber - 1,
      div,
      accessibilityManager: this.options.accessibilityManager,
      annotationLayer: this.options.annotationLayer,
      drawLayer: this.options.drawLayer,
      textLayer: this.options.textLayer?.textLayer,
      viewport: clonedViewport,
      l10n: this.options.l10n,
    })

    this.annotationEditorLayer.render({
      viewport: clonedViewport,
    })

    this.show()
  }

  cancel() {
    this.cancelled = true

    if (!this.div) return

    this.annotationEditorLayer?.destroy()
  }

  hide() {
    if (!this.div) return

    this.div.hidden = true
  }

  show() {
    if (!this.div || this.annotationEditorLayer?.isInvisible) return

    this.div.hidden = false
  }
}
