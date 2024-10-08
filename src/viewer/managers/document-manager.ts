import * as pdfjs from '@/pdfjs'
import * as constants from '@/config'
import { ScrollMode, SpreadMode, TextLayerMode } from '@/enums'
import { Page } from '../page'
import { Manager } from './'

export class DocumentManager extends Manager {
  private firstPageCapability: PromiseWithResolvers<pdfjs.PDFPageProxy> = Promise.withResolvers()
  private onePageRenderedCapability: PromiseWithResolvers<{ timestamp: number }> = Promise.withResolvers()
  private pagesCapability: PromiseWithResolvers<void> = Promise.withResolvers()
  private abortController?: AbortController
  private _pdfDocument?: pdfjs.PDFDocumentProxy

  async loadDocument(document?: pdfjs.DocumentType) {
    this.dispatch('documentload', { document })

    this.setDocument(await pdfjs.loadDocument(document))
  }

  reset() {
    this.firstPageCapability = Promise.withResolvers()
    this.onePageRenderedCapability = Promise.withResolvers()
    this.pagesCapability = Promise.withResolvers()
    this.abortController?.abort()
    this.abortController = undefined
  }

  get firstPagePromise() {
    return this.pdfDocument ? this.firstPageCapability.promise : null
  }

  get onePageRendered() {
    return this.pdfDocument ? this.onePageRenderedCapability.promise : null
  }

  get pagesPromise() {
    return this.pdfDocument ? this.pagesCapability.promise : null
  }

  private initializePermissions(permissions?: number[]) {
    const params = {
      annotationEditorMode: this.options.annotationEditorMode ?? pdfjs.AnnotationEditorType.NONE,
      annotationMode: this.annotationManager.annotationMode,
      textLayerMode: this.options.textLayerMode ?? TextLayerMode.ENABLE,
    }

    if (!permissions) {
      return params
    }

    if (!permissions.includes(pdfjs.PermissionFlag.COPY) && params.textLayerMode === TextLayerMode.ENABLE) {
      params.textLayerMode = TextLayerMode.ENABLE_PERMISSIONS
    }

    if (!permissions.includes(pdfjs.PermissionFlag.MODIFY_CONTENTS)) {
      params.annotationEditorMode = pdfjs.AnnotationEditorType.DISABLE
    }

    if (
      !permissions.includes(pdfjs.PermissionFlag.MODIFY_ANNOTATIONS)
      && !permissions.includes(pdfjs.PermissionFlag.FILL_INTERACTIVE_FORMS)
      && this.annotationManager.annotationMode === pdfjs.AnnotationMode.ENABLE_FORMS
    ) {
      params.annotationMode = pdfjs.AnnotationMode.ENABLE
    }

    return params
  }

  private async onePageRenderedOrForceFetch(signal: AbortSignal) {
    if (document.visibilityState === 'hidden'
      || !this.container.offsetParent
      || this.scrollManager.getVisiblePages().views.length === 0
    ) {
      return
    }

    const hiddenCapability = Promise.withResolvers<void>()

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        hiddenCapability.resolve()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange, { signal })
    await Promise.race([this.onePageRenderedCapability.promise, hiddenCapability.promise])
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }

  getDocument() {
    return this._pdfDocument
  }

  get signal() {
    return this.abortController?.signal
  }

  setDocument(pdfDocument?: pdfjs.PDFDocumentProxy) {
    if (this.pdfDocument) {
      this.dispatch('documentdestroy')
      this.viewer.reset()
    }

    this._pdfDocument = pdfDocument

    if (!this.pdfDocument) {
      this.dispatch('documentempty')
      return
    }

    const pagesCount = this.pdfDocument.numPages
    const firstPagePromise = this.pdfDocument.getPage(1)
    const optionalContentConfigPromise = this.pdfDocument.getOptionalContentConfig({ intent: 'display' })
    const permissionsPromise = this.options.enablePermissions ? this.pdfDocument.getPermissions() : Promise.resolve()

    this.abortController = new AbortController()
    const { signal } = this.abortController

    if (pagesCount > constants.FORCE_SCROLL_MODE_PAGE) {
      console.warn('Forcing PAGE-scrolling for performance reasons, given the length of the document.')
      const mode = this.scrollManager.scrollMode = ScrollMode.PAGE
      this.dispatch('scrollmodechanged', { mode })
    }

    this.pagesCapability.promise.then(() => {
      this.dispatch('pagesloaded', { pagesCount })
    }, () => { })

    const onBeforeDraw = (evt: { pageNumber: number }) => {
      const page = this.pages[evt.pageNumber - 1]

      if (!page) return

      this.renderManager.buffer.push(page)
    }

    const onAfterDraw = (evt: { cssTransform: boolean, timestamp: number }) => {
      if (evt.cssTransform) return

      this.onePageRenderedCapability.resolve({ timestamp: evt.timestamp })
      this.off('pagerendered', onAfterDraw)
    }

    this.on('pagerender', onBeforeDraw, { signal })
    this.on('pagerendered', onAfterDraw, { signal })

    Promise.all([firstPagePromise, permissionsPromise]).then(([firstPdfPage, permissions]) => {
      if (pdfDocument !== this.pdfDocument) {
        return
      }

      this.firstPageCapability.resolve(firstPdfPage)
      this.optionalContentManager.optionalContentConfig = optionalContentConfigPromise

      const params = this.initializePermissions(permissions ?? undefined)
      const viewport = firstPdfPage.getViewport({ scale: this.currentScale * pdfjs.PixelsPerInch.PDF_TO_CSS_UNITS })

      this.dispatch('firstpageloaded', { firstPdfPage, viewport, ...params })

      const layerBuilders = this.layerBuildersManager.layersToArray()

      for (let pageNum = 1; pageNum <= pagesCount; ++pageNum) {
        this.pages.push(new Page({
          id: pageNum,
          viewport: viewport.clone(),
          eventBus: this.eventBus,
          container: this.scrollMode === ScrollMode.PAGE ? undefined : this.viewerContainer,
          scale: this.currentScale,
          rotation: this.pagesRotation,
          optionalContentConfigPromise,
          renderingQueue: this.renderingQueue,
          maxCanvasPixels: this.options.maxCanvasPixels ?? constants.MAX_CANVAS_PIXELS,
          textLayerMode: params.textLayerMode,
          imageResourcesPath: this.options.imageResourcesPath,
          annotationMode: params.annotationMode,
          layerBuilders,
          layerProperties: this.viewer.layerPropertiesManager,
          enableHWA: this.options.enableHWA,
        }))
      }

      this.pages[0]?.setPdfPage(firstPdfPage)

      if (this.scrollManager.scrollMode === ScrollMode.PAGE) {
        this.scrollManager.ensurePageVisible()
      } else if (this.spreadManager.spreadMode !== SpreadMode.NONE) {
        this.spreadManager.updateSpreadMode()
      }

      if (this.scaleManager.currentScaleValue) {
        this.scaleManager.setScale(this.scaleManager.currentScaleValue, { noScroll: false })
      }

      this.onePageRenderedOrForceFetch(signal).then(async () => {
        if (pdfDocument !== this.pdfDocument) {
          return
        }

        this.dispatch('onepagerendered', { firstPdfPage, viewport, ...params })

        if (this.pdfDocument?.loadingParams.disableAutoFetch || pagesCount > constants.FORCE_LAZY_PAGE_INIT) {
          this.pagesCapability.resolve()
          return
        }

        let getPagesLeft = pagesCount - 1

        if (getPagesLeft <= 0) {
          this.pagesCapability.resolve()
          return
        }

        for (let pageNum = 2; pageNum <= pagesCount; ++pageNum) {
          const promise = this.pdfDocument?.getPage(pageNum).then((pdfPage) => {
            const page = this.pages[pageNum - 1]
            if (!page.pdfPage) {
              page.setPdfPage(pdfPage)
            }
            if (--getPagesLeft === 0) {
              this.pagesCapability.resolve()
            }
          }, (reason) => {
            console.error(`Unable to get page ${pageNum} to initialize viewer`, reason)
            if (--getPagesLeft === 0) {
              this.pagesCapability.resolve()
            }
          })

          if (pageNum % constants.PAUSE_EAGER_PAGE_INIT === 0) {
            await promise
          }
        }
      })

      this.dispatch('documentinit')
      queueMicrotask(() => this.viewer.update())
    }).catch((reason) => {
      console.error('Unable to initialize viewer', reason)
      this.pagesCapability.reject(reason)
    })
  }
}
