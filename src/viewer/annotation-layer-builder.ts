import type { TextAccessibilityManager } from './text-accessibility-manager'
import type {
  AnnotationEditorUIManager,
  AnnotationStorage,
  IDownloadManager,
  IPDFLinkService,
  PDFPageProxy,
  PageViewport,
} from './types'
import { AnnotationLayer } from './pdfjs'
import { PresentationModeState } from './enums'

export class AnnotationLayerBuilder {
  public div?: HTMLDivElement
  private cancelled: boolean = false
  private eventAbortController?: AbortController
  public annotationLayer?: AnnotationLayer

  constructor(public readonly options: {
    pdfPage: PDFPageProxy
    linkService: IPDFLinkService
    eventBus: any
    downloadManager: IDownloadManager
    annotationStorage?: AnnotationStorage
    imageResourcesPath?: string
    renderForms: boolean
    enableScripting?: boolean
    hasJSActionsPromise?: Promise<boolean>
    fieldObjectsPromise?: Promise<{ [x: string]: Object[] } | null | undefined>
    annotationCanvasMap?: Map<string, HTMLCanvasElement>
    accessibilityManager?: TextAccessibilityManager
    annotationEditorUIManager?: AnnotationEditorUIManager
    onAppend?: (div: HTMLDivElement) => void
  }) { }

  async render(viewport: PageViewport, intent = 'display') {
    if (this.div) {
      if (this.cancelled || !this.annotationLayer) {
        return
      }

      this.annotationLayer.update({
        viewport: viewport.clone({
          dontFlip: true,
        }),
      })

      return
    }

    const [annotations, hasJSActions, fieldObjects] = await Promise.all([
      this.options.pdfPage.getAnnotations({ intent }),
      this.options.hasJSActionsPromise || Promise.resolve(false),
      this.options.fieldObjectsPromise || Promise.resolve(null),
    ])

    if (this.cancelled) {
      return
    }

    const div = this.div = document.createElement('div')
    div.className = 'annotationLayer'

    this.options.onAppend?.(div)

    if (annotations.length === 0) {
      this.hide()
      return
    }

    this.annotationLayer = new AnnotationLayer({
      div,
      accessibilityManager: this.options.accessibilityManager,
      annotationCanvasMap: this.options.annotationCanvasMap,
      annotationEditorUIManager: this.options.annotationEditorUIManager,
      page: this.options.pdfPage,
      viewport: viewport.clone({ dontFlip: true }),
    })

    await this.annotationLayer.render({
      annotations,
      imageResourcesPath: this.options.imageResourcesPath ?? '',
      renderForms: this.options.renderForms ?? true,
      linkService: this.options.linkService,
      downloadManager: this.options.downloadManager,
      annotationStorage: this.options.annotationStorage,
      enableScripting: this.options.enableScripting ?? false,
      hasJSActions,
      fieldObjects,
    })

    if (this.options.linkService.isInPresentationMode) {
      this.updatePresentationModeState(PresentationModeState.FULLSCREEN)
    }

    if (!this.eventAbortController) {
      this.eventAbortController = new AbortController()
      this.options.eventBus?.on(
        'presentationmodechanged',
        ({ state }: { state: PresentationModeState }) => { this.updatePresentationModeState(state) },
        { signal: this.eventAbortController.signal },
      )
    }
  }

  cancel() {
    this.cancelled = true
    this.eventAbortController?.abort()
    this.eventAbortController = undefined
  }

  hide() {
    if (!this.div) return

    this.div.hidden = true
  }

  private updatePresentationModeState(state: PresentationModeState) {
    if (!this.div) return

    const disableFormElements = PresentationModeState.FULLSCREEN === state

    for (const section of this.div.childNodes) {
      if (!(section instanceof HTMLElement) || section.hasAttribute('data-internal-link')) {
        continue
      }

      section.inert = disableFormElements
    }
  }
}
