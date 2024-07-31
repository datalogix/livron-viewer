import type { IPDFLinkService, AnnotationStorage, PDFPageProxy, PageViewport } from './types'
import { XfaLayer } from './pdfjs'

export class XfaLayerBuilder {
  public div?: HTMLDivElement
  private cancelled: boolean = false

  constructor(
    private readonly pdfPage: PDFPageProxy,
    private readonly annotationStorage: AnnotationStorage,
    private readonly linkService: IPDFLinkService,
    private readonly xfaHtml?: Object,
  ) { }

  async render(viewport: PageViewport, intent = 'display') {
    if (intent === 'print') {
      this.div = document.createElement('div')

      return XfaLayer.render({
        viewport: viewport.clone({ dontFlip: true }),
        div: this.div,
        xfaHtml: this.xfaHtml!,
        annotationStorage: this.annotationStorage,
        linkService: this.linkService,
        intent,
      })
    }

    const xfaHtml = await this.pdfPage.getXfa()

    if (this.cancelled || !xfaHtml) {
      return { textDivs: [] }
    }

    const parameters = {
      viewport: viewport.clone({ dontFlip: true }),
      xfaHtml,
      annotationStorage: this.annotationStorage,
      linkService: this.linkService,
      intent,
    }

    if (this.div) {
      return XfaLayer.update({
        div: this.div,
        ...parameters,
      })
    }

    return XfaLayer.render({
      div: this.div = document.createElement('div'),
      ...parameters,
    })
  }

  cancel() {
    this.cancelled = true
  }

  hide() {
    if (!this.div) return

    this.div.hidden = true
  }
}
