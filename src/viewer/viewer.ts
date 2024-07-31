import type { PDFDocumentProxy, PDFPageProxy, OptionalContentConfig, VisibleElements, VisiblePage, UpdateScale, PageUpdate } from './types'
import { AnnotationEditorUIManager, AnnotationMode, AnnotationEditorType, PixelsPerInch, PermissionFlag, shadow } from './pdfjs'
import { Page } from './page'
import { CopyManager } from './copy-manager'
import { RenderingQueue } from './rendering-queue'
import { Buffer } from './buffer'
import { ScriptingManager } from './scripting-manager'
import { FindController } from './find-controller'
import { EventBus } from './eventbus'
import { TextLayerMode, PresentationModeState, RenderingStates, ScrollMode, SpreadMode } from './enums'
import { getVisibleElements, isPortraitOrientation, isValidAnnotationEditorMode, isValidRotation, isValidScrollMode, isValidSpreadMode, scrollIntoView, watchScroll } from './utils'
import * as constants from './constants'

export class Viewer {
  private buffer = new Buffer<Page>(constants.DEFAULT_CACHE_SIZE)
  private previousContainerHeight = 0
  private resizeObserver = new ResizeObserver(this.resizeObserverCallback.bind(this))
  private containerTopLeft?: [number, number]
  private altTextManager = null
  private annotationEditorUIManager?: AnnotationEditorUIManager
  private annotationMode: number = AnnotationMode.ENABLE_FORMS
  private eventAbortController?: AbortController
  private scrollModePageState: {
    previousPageNumber: number
    scrollDown: boolean
    pages: Page[]
  } = {
      previousPageNumber: 1,
      scrollDown: true,
      pages: [],
    }
  
  private textLayerMode = TextLayerMode.ENABLE
  private pages: Page[] = []
  private pageLabels?: string[]
  private pdfDocument?: PDFDocumentProxy
  private _currentPageNumber: number = 0
  private _currentScale: number = 0
  private _currentScaleValue?: string | number
  private _pagesRotation: number = 0
  private _spreadMode: SpreadMode = SpreadMode.NONE
  private _scrollMode = ScrollMode.VERTICAL
  private previousScrollMode: ScrollMode = ScrollMode.UNKNOWN
  private _annotationEditorMode = AnnotationEditorType.NONE
  private scaleTimeoutId?: number
  public readonly eventBus: EventBus
  private container: HTMLDivElement = document.createElement('div')
  private viewerContainer: HTMLDivElement = document.createElement("div")
  private location?: any
  private scriptingManager?: ScriptingManager
  private firstPageCapability: PromiseWithResolvers<PDFPageProxy> = Promise.withResolvers()
  private onePageRenderedCapability: PromiseWithResolvers<{ timestamp: number }> = Promise.withResolvers()
  private pagesCapability: PromiseWithResolvers<void> = Promise.withResolvers()
  private renderingQueue: RenderingQueue = new RenderingQueue()
  private presentationModeState: PresentationModeState = PresentationModeState.UNKNOWN
  private _optionalContentConfigPromise?: Promise<OptionalContentConfig>
  private scroll
  private findController?: FindController
  private l10n?: any
  private mlManager?: any
  private pageColors?: { foreground: string, background: string }
  private enablePermissions?: boolean
  private maxCanvasPixels?: number
  private removePageBorders?: boolean
  private enablePrintAutoRotate?: boolean
  private imageResourcesPath?: string
  private enableHighlightFloatingButton?: boolean
  private annotationEditorHighlightColors?: any
  private linkService?: any
  private downloadManager?: any
  private copyManager: CopyManager

  constructor(options: {
    container: HTMLDivElement
    removePageBorders?: boolean
    enableHighlightFloatingButton?: boolean
    enablePrintAutoRotate?: boolean
    pageColors?: { foreground: string, background: string }
    mlManager?: any
    enablePermissions?: boolean
    maxCanvasPixels?: number
    imageResourcesPath?: string
    annotationEditorHighlightColors?: any
    eventBus?: EventBus
    altTextManager?: any
    findController?: any
    downloadManager?: any
    linkService?: any
    scriptingManager?: any
    l10n?: any
    textLayerMode?: TextLayerMode
    annotationMode?: number
    annotationEditorMode?: number
    abortSignal?: any
  }) {
    this.container.appendChild(this.viewerContainer)
    this.container.id = 'viewerContainer'

    this.viewerContainer.id = 'viewer'
    this.viewerContainer.classList.add('pdfViewer')

    options.container.appendChild(this.container)

    this.eventBus = options.eventBus ?? new EventBus()
    this.scriptingManager = options.scriptingManager
    this.linkService = options.linkService
    this.downloadManager = options.downloadManager
    this.findController = options.findController
    this.altTextManager = options.altTextManager
   
    if (this.findController) {
      this.findController.onIsPageVisible = pageNumber => this.getVisiblePages().ids.has(pageNumber)
    }

    this.textLayerMode = options.textLayerMode ?? TextLayerMode.ENABLE
    this.annotationMode = options.annotationMode ?? AnnotationMode.ENABLE_FORMS
    this._annotationEditorMode = options.annotationEditorMode ?? AnnotationEditorType.NONE
    this.annotationEditorHighlightColors = options.annotationEditorHighlightColors
    this.enableHighlightFloatingButton = options.enableHighlightFloatingButton
    this.imageResourcesPath = options.imageResourcesPath || ''
    this.enablePrintAutoRotate = options.enablePrintAutoRotate
    this.removePageBorders = options.removePageBorders
    this.maxCanvasPixels = options.maxCanvasPixels
    this.enablePermissions = options.enablePermissions
    this.pageColors = options.pageColors
    this.mlManager = options.mlManager
    this.l10n = options.l10n
    this.renderingQueue.setViewer(this)
    this.scroll = watchScroll(this.container, this.scrollUpdate.bind(this))

    this.copyManager = new CopyManager(this.container)
    this.resizeObserver.observe(this.container);
    options.abortSignal?.addEventListener(
      'abort',
      () => this.resizeObserver.disconnect(),
      { once: true }
    );

    this.resetView()

    if (this.removePageBorders) {
      this.viewerContainer.classList.add('removePageBorders')
    }

    this.updateContainerHeightCss()

    this.eventBus.on('thumbnailrendered', ({
      pageNumber,
      pdfPage,
    }) => {
      const page = this.pages[pageNumber - 1]
      if (!this.buffer.has(page)) {
        pdfPage?.cleanup()
      }
    })

    if (!options.l10n) {
    //  this.l10n.translate(this.container)
    }
  }

  get spreadMode() {
    return this._spreadMode
  }

  set spreadMode(mode) {
    if (this._spreadMode === mode || mode === SpreadMode.UNKNOWN) {
      return
    }

    if (!isValidSpreadMode(mode)) {
      throw new Error(`Invalid spread mode: ${mode}`);
    }

    this._spreadMode = mode
    this.eventBus.dispatch("spreadmodechanged", { source: this, mode });
    
    this.updateSpreadMode(this._currentPageNumber)
  }

  get pagesCount() {
    return this.pages.length
  }

  getPage(index: number) {
    return this.pages[index]
  }

  getCachedPages() {
    return new Set(this.buffer)
  }

  get pagesReady() {
    return this.pages.every(page => page?.pdfPage)
  }

  get renderForms() {
    return this.annotationMode === AnnotationMode.ENABLE_FORMS
  }

  get enableScripting() {
    return !!this.scriptingManager
  }

  get currentPageNumber() {
    return this._currentPageNumber
  }

  set currentPageNumber(val: number) {
    if (!Number.isInteger(val)) {
      throw new Error('Invalid page number.')
    }

    if (!this.pdfDocument) {
      return
    }

    if (!this.setCurrentPageNumber(val, true)) {
      console.error(`currentPageNumber: "${val}" is not a valid page.`)
    }
  }

  private setCurrentPageNumber(val: number, resetCurrentPage = false) {
    if (this._currentPageNumber === val) {
      if (resetCurrentPage) {
        this.resetCurrentPage()
      }

      return true
    }

    if (!(0 < val && val <= this.pagesCount)) {
      return false
    }
  
    const previous = this._currentPageNumber

    this._currentPageNumber = val
    this.eventBus.dispatch('pagechanging', {
      source: this,
      pageNumber: val,
      pageLabel: this.pageLabels?.[val - 1] ?? null,
      previous,
    })

    if (resetCurrentPage) {
      this.resetCurrentPage()
    }

    return true
  }

  get currentPageLabel() {
    return this.pageLabels?.[this._currentPageNumber - 1] ?? null
  }

  set currentPageLabel(val: string|null) {
    if (!this.pdfDocument) {
      return
    }

    let page = val | 0

    if (this.pageLabels) {
      const i = this.pageLabels.indexOf(val)
      if (i >= 0) {
        page = i + 1
      }
    }

    if (!this.setCurrentPageNumber(page, true)) {
      console.error(`currentPageLabel: "${val}" is not a valid page.`)
    }
  }

  get currentScale() {
    return this._currentScale !== constants.UNKNOWN_SCALE ? this._currentScale : constants.DEFAULT_SCALE
  }

  set currentScale(val) {
    if (isNaN(val)) {
      throw new Error('Invalid numeric scale.')
    }

    if (!this.pdfDocument) {
      return
    }

    this.setScale(val, { noScroll: false })
  }

  get currentScaleValue() {
    return this._currentScaleValue
  }

  set currentScaleValue(val) {
    if (!this.pdfDocument) {
      return
    }

    this.setScale(val!, { noScroll: false })
  }

  get pagesRotation() {
    return this._pagesRotation
  }

  set pagesRotation(rotation) {
    if (!isValidRotation(rotation)) {
      throw new Error('Invalid pages rotation angle.')
    }

    if (!this.pdfDocument) {
      return
    }

    rotation %= 360

    if (rotation < 0) {
      rotation += 360
    }

    if (this._pagesRotation === rotation) {
      return
    }

    this._pagesRotation = rotation
    const pageNumber = this._currentPageNumber

    this.refresh(true, { rotation })

    if (this._currentScaleValue) {
      this.setScale(this._currentScaleValue, { noScroll: true })
    }

    this.eventBus.dispatch('rotationchanging', {
      source: this,
      pagesRotation: rotation,
      pageNumber,
    })

    this.update()
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

  get _layerProperties() {
    const self = this
    return shadow(this, '_layerProperties', {
      get annotationEditorUIManager() {
        return self.annotationEditorUIManager
      },
      get annotationStorage() {
        return self.pdfDocument?.annotationStorage
      },
      get downloadManager() {
        return self.downloadManager
      },
      get enableScripting() {
        return !!self.scriptingManager
      },
      get fieldObjectsPromise() {
        return self.pdfDocument?.getFieldObjects()
      },
      get findController() {
        return self.findController
      },
      get hasJSActionsPromise() {
        return self.pdfDocument?.hasJSActions()
      },
      get linkService() {
        return self.linkService
      },
    })
  }

  private initializePermissions(permissions?: number[]) {
    const params = {
      annotationEditorMode: this._annotationEditorMode,
      annotationMode: this.annotationMode,
      textLayerMode: this.textLayerMode,
    }

    if (!permissions) {
      return params
    }

    if (!permissions.includes(PermissionFlag.COPY) && this.textLayerMode === TextLayerMode.ENABLE) {
      params.textLayerMode = TextLayerMode.ENABLE_PERMISSIONS
    }

    if (!permissions.includes(PermissionFlag.MODIFY_CONTENTS)) {
      params.annotationEditorMode = AnnotationEditorType.DISABLE
    }

    if (!permissions.includes(PermissionFlag.MODIFY_ANNOTATIONS) && !permissions.includes(PermissionFlag.FILL_INTERACTIVE_FORMS) && this.annotationMode === AnnotationMode.ENABLE_FORMS) {
      params.annotationMode = AnnotationMode.ENABLE
    }

    return params
  }

  private async onePageRenderedOrForceFetch(signal: AbortSignal) {
    if (document.visibilityState === 'hidden' || !this.container.offsetParent || this.getVisiblePages().pages.length === 0) {
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

  setDocument(pdfDocument: PDFDocumentProxy) {
    if (this.pdfDocument) {
      this.eventBus.dispatch('pagesdestroy', { source: this })
      this.cancelRendering()
      this.resetView()
      this.findController?.setDocument(undefined)
      this.scriptingManager?.setDocument(undefined)
      this.annotationEditorUIManager?.destroy()
      this.annotationEditorUIManager = undefined
    }

    this.pdfDocument = pdfDocument

    if (!pdfDocument) {
      return
    }

    const pagesCount = pdfDocument.numPages
    const firstPagePromise = pdfDocument.getPage(1)
    const optionalContentConfigPromise = pdfDocument.getOptionalContentConfig({ intent: 'display' })
    const permissionsPromise = this.enablePermissions ? pdfDocument.getPermissions() : Promise.resolve()

    this.eventAbortController = new AbortController()
    const { signal } = this.eventAbortController

    if (pagesCount > constants.FORCE_SCROLL_MODE_PAGE) {
      console.warn('Forcing PAGE-scrolling for performance reasons, given the length of the document.')
      const mode = this._scrollMode = ScrollMode.PAGE
      this.eventBus.dispatch('scrollmodechanged', { source: this, mode })
    }

    this.pagesCapability.promise.then(() => {
      this.eventBus.dispatch('pagesloaded', { source: this, pagesCount })
    }, () => { })

    const onBeforeDraw = (evt: { pageNumber: number }) => {
      const page = this.pages[evt.pageNumber - 1]

      if (!page) {
        return
      }

      this.buffer.push(page)
    }

    this.eventBus.on('pagerender', onBeforeDraw, {
      signal,
    })

    const onAfterDraw = (evt) => {
      if (evt.cssTransform) {
        return
      }

      this.onePageRenderedCapability.resolve({ timestamp: evt.timestamp })
      this.eventBus.off('pagerendered', onAfterDraw)
    }

    this.eventBus.on('pagerendered', onAfterDraw, {
      signal,
    })

    Promise.all([firstPagePromise, permissionsPromise]).then(([firstPdfPage, permissions]) => {
      if (pdfDocument !== this.pdfDocument) {
        return
      }

      this.firstPageCapability.resolve(firstPdfPage)
      this._optionalContentConfigPromise = optionalContentConfigPromise

      const { annotationEditorMode, annotationMode, textLayerMode } = this.initializePermissions(permissions ?? undefined)

      if (textLayerMode !== TextLayerMode.DISABLE) {
        this.viewerContainer.before(this.copyManager.start())
      }

      /*if (annotationEditorMode !== AnnotationEditorType.DISABLE) {
        const mode = annotationEditorMode
        if (pdfDocument.isPureXfa) {
          console.warn('Warning: XFA-editing is not implemented.')
        }
        else if (isValidAnnotationEditorMode(mode)) {
          this.annotationEditorUIManager = new AnnotationEditorUIManager(
            this.container,
            viewerContainer,
            this.altTextManager,
            this.eventBus,
            pdfDocument,
            this.pageColors,
            this.annotationEditorHighlightColors,
            this.enableHighlightFloatingButton,
            this.mlManager,
          )

          this.eventBus.dispatch('annotationeditoruimanager', {
            source: this,
            uiManager: this.annotationEditorUIManager,
          })

          if (mode !== AnnotationEditorType.NONE) {
            this.annotationEditorUIManager.updateMode(mode)
          }
        }
        else {
          console.error(`Invalid AnnotationEditor mode: ${mode}`)
        }
      }*/

      const viewerElement = this._scrollMode === ScrollMode.PAGE ? undefined : this.viewerContainer
      const scale = this.currentScale
      const viewport = firstPdfPage.getViewport({ scale: scale * PixelsPerInch.PDF_TO_CSS_UNITS })

      this.viewerContainer.style.setProperty('--scale-factor', viewport.scale.toString())

      if (this.pageColors?.foreground === 'CanvasText' || this.pageColors?.background === 'Canvas') {
        this.viewerContainer.style.setProperty(
          '--hcm-highlight-filter',
          // @ts-ignore
          pdfDocument.filterFactory.addHighlightHCMFilter('highlight', 'CanvasText', 'Canvas', 'HighlightText', 'Highlight')
        )

        this.viewerContainer.style.setProperty(
          '--hcm-highlight-selected-filter',
          // @ts-ignore
          pdfDocument.filterFactory.addHighlightHCMFilter('highlight_selected', 'CanvasText', 'Canvas', 'HighlightText', 'ButtonText')
        )
      }

      for (let pageNum = 1; pageNum <= pagesCount; ++pageNum) {
        const page = new Page(
          pageNum,
          this._layerProperties,
          viewport.clone(),
          this.eventBus,
          this.l10n,
          viewerElement,
          scale,
          optionalContentConfigPromise,
          this.imageResourcesPath,
          this.renderingQueue,
          this.maxCanvasPixels,
          this.pageColors,
          annotationMode,
          textLayerMode,
        )

        this.pages.push(page)
      }

      this.pages[0]?.setPdfPage(firstPdfPage)

      if (this._scrollMode === ScrollMode.PAGE) {
        this.ensurePageVisible()
      } else if (this._spreadMode!== SpreadMode.NONE) {
        this.updateSpreadMode()
      }

      this.onePageRenderedOrForceFetch(signal).then(async () => {
        if (pdfDocument !== this.pdfDocument) {
          return
        }

        this.findController?.setDocument(pdfDocument)
        this.scriptingManager?.setDocument(pdfDocument)
        this.copyManager.setDocument(pdfDocument, textLayerMode, signal)

        if (this.annotationEditorUIManager) {
          this.eventBus.dispatch('annotationeditormodechanged', {
            source: this,
            mode: this._annotationEditorMode,
          })
        }

        if (pdfDocument.loadingParams.disableAutoFetch || pagesCount > constants.FORCE_LAZY_PAGE_INIT) {
          this.pagesCapability.resolve()
          return
        }

        let getPagesLeft = pagesCount - 1

        if (getPagesLeft <= 0) {
          this.pagesCapability.resolve()
          return
        }

        for (let pageNum = 2; pageNum <= pagesCount; ++pageNum) {
          const promise = pdfDocument.getPage(pageNum).then((pdfPage) => {
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

      this.eventBus.dispatch('pagesinit', { source: this })

      pdfDocument.getMetadata().then(({ info }) => {
        if (pdfDocument !== this.pdfDocument) {
          return
        }
        // @ts-ignore
        if (info.Language) {
          // @ts-ignore
          this.viewerContainer.lang = info.Language
        }
      })

      this.update()
    }).catch((reason) => {
      console.error('Unable to initialize viewer', reason)
      this.pagesCapability.reject(reason)
    })
  }

  setPageLabels(labels?: string[]) {
    if (!this.pdfDocument) {
      return
    }

    if (!labels) {
      this.pageLabels = undefined
    } else if (!(Array.isArray(labels) && this.pdfDocument.numPages === labels.length)) {
      this.pageLabels = undefined
      console.error('setPageLabels: Invalid page labels.')
    } else {
      this.pageLabels = labels
    }

    for (let i = 0, ii = this.pages.length; i < ii; i++) {
      this.pages[i].setPageLabel(this.pageLabels?.[i])
    }
  }

  private resetView() {
    this.pages = []
    this._currentPageNumber = 1
    this._currentScale = constants.UNKNOWN_SCALE
    this._currentScaleValue = undefined
    this.pageLabels = undefined
    this.buffer = new Buffer(constants.DEFAULT_CACHE_SIZE)
    this.location = undefined
    this._pagesRotation = 0
    this._optionalContentConfigPromise = undefined
    this.firstPageCapability = Promise.withResolvers()
    this.onePageRenderedCapability = Promise.withResolvers()
    this.pagesCapability = Promise.withResolvers()
    this._scrollMode = ScrollMode.VERTICAL
    this.previousScrollMode = ScrollMode.UNKNOWN
    this._spreadMode = SpreadMode.NONE
    this.scrollModePageState = {
      previousPageNumber: 1,
      scrollDown: true,
      pages: [],
    }
    this.eventAbortController?.abort()
    this.eventAbortController = undefined
    this.viewerContainer.textContent = ''
    this.updateScrollMode()
    this.viewerContainer.removeAttribute('lang')
    this.copyManager.reset()
  }

  private ensurePageVisible() {
    if (this._scrollMode !== ScrollMode.PAGE) {
      throw new Error("#ensurePageVisible: Invalid scrollMode value.");
    }
    
    // Temporarily remove all the pages from the DOM...
    this.viewerContainer.textContent = "";
    // ... and clear out the active ones.
    this.scrollModePageState.pages.length = 0;

    if (this._spreadMode === SpreadMode.NONE && !this.isInPresentationMode) {
      // Finally, append the new page to the viewer.
      const page = this.pages[this._currentPageNumber - 1];
      this.viewerContainer.append(page.div);

      this.scrollModePageState.pages.push(page);
    } else {
      const pageIndexSet = new Set<number>(),
        parity = this._spreadMode - 1;

      // Determine the pageIndices in the new spread.
      if (parity === -1) {
        // PresentationMode is active, with `SpreadMode.NONE` set.
        pageIndexSet.add(this._currentPageNumber - 1);
      } else if (this._currentPageNumber % 2 !== parity) {
        // Left-hand side page.
        pageIndexSet.add(this._currentPageNumber - 1);
        pageIndexSet.add(this._currentPageNumber);
      } else {
        // Right-hand side page.
        pageIndexSet.add(this._currentPageNumber - 2);
        pageIndexSet.add(this._currentPageNumber - 1);
      }

      // Finally, append the new pages to the viewer and apply the spreadMode.
      const spread = document.createElement("div");
      spread.className = "spread";

      if (this.isInPresentationMode) {
        const dummyPage = document.createElement("div");
        dummyPage.className = "dummyPage";
        spread.append(dummyPage);
      }

      for (const i of pageIndexSet) {
        const page = this.pages[i];
        if (!page) {
          continue;
        }
        spread.append(page.div);

        this.scrollModePageState.pages.push(page);
      }
      this.viewerContainer.append(spread);
    }

    this.scrollModePageState.scrollDown = this._currentPageNumber >= this.scrollModePageState.previousPageNumber;
    this.scrollModePageState.previousPageNumber = this._currentPageNumber;
  }

  private scrollUpdate() {
    if (!this.pagesCount) return

    this.update()
  }

  private scrollIntoView(page: Page, pageSpot?: { top: number, left: number }) {
    if (this._currentPageNumber !== page.id) {
      this.setCurrentPageNumber(page.id)
    }

    if (this._scrollMode === ScrollMode.PAGE) {
      this.ensurePageVisible()
      this.update()
    }

    if (!pageSpot && !this.isInPresentationMode) {
      const left = page.div.offsetLeft + page.div.clientLeft
      const right = left + page.div.clientWidth

      if (this._scrollMode === ScrollMode.HORIZONTAL
        || left < this.container.scrollLeft
        || right > this.container.scrollLeft + this.container.clientWidth
      ) {
        pageSpot = {
          left: 0,
          top: 0,
        }
      }
    }

    scrollIntoView(page.div, pageSpot)

    if (!this._currentScaleValue && this.location) {
      this.location = undefined
    }
  }

  private isSameScale(newScale: number) {
    return newScale === this._currentScale || Math.abs(newScale - this._currentScale) < 1e-15
  }

  private setScaleUpdatePages(newScale: number, newValue: string | number, {
    noScroll = false,
    preset = false,
    drawingDelay = -1,
    origin = null,
  }) {
    this._currentScaleValue = newValue.toString()

    if (this.isSameScale(newScale)) {
      if (preset) {
        this.eventBus.dispatch('scalechanging', {
          source: this,
          scale: newScale,
          presetValue: newValue,
        })
      }

      return
    }

    this.viewerContainer.style.setProperty('--scale-factor', (newScale * PixelsPerInch.PDF_TO_CSS_UNITS).toString())
    const postponeDrawing = drawingDelay >= 0 && drawingDelay < 1000

    this.refresh(true, {
      scale: newScale,
      drawingDelay: postponeDrawing ? drawingDelay : -1,
    })

    if (postponeDrawing) {
      this.scaleTimeoutId = setTimeout(() => {
        this.scaleTimeoutId = undefined
        this.refresh()
      }, drawingDelay)
    }

    const previousScale = this._currentScale
    this._currentScale = newScale

    if (!noScroll) {
      let page = this._currentPageNumber
      let dest

      if (this.location && !(this.isInPresentationMode || this.isChangingPresentationMode)) {
        page = this.location.pageNumber
        dest = [null, {
          name: 'XYZ',
        }, this.location.left, this.location.top, null]
      }

      this.scrollPageIntoView({
        pageNumber: page,
        destArray: dest,
        allowNegativeOffset: true,
      })

      if (Array.isArray(origin)) {
        const scaleDiff = newScale / previousScale - 1
        const [top, left] = this.getContainerTopLeft()
        this.container.scrollLeft += (origin[0] - left) * scaleDiff
        this.container.scrollTop += (origin[1] - top) * scaleDiff
      }
    }

    this.eventBus.dispatch('scalechanging', {
      source: this,
      scale: newScale,
      presetValue: preset ? newValue : undefined,
    })

    this.update()
  }

  getContainerTopLeft() {
    return this.containerTopLeft ||= [this.container.offsetTop, this.container.offsetLeft]
  }

  private updateContainerHeightCss(height = this.container.clientHeight) {
    if (height !== this.previousContainerHeight) {
      this.previousContainerHeight = height
      document.documentElement.style.setProperty('--viewer-container-height', `${height}px`)
    }
  }

  private resizeObserverCallback(entries: ResizeObserverEntry[]) {
    for (const entry of entries) {
      if (entry.target === this.container) {
        this.updateContainerHeightCss(Math.floor(entry.borderBoxSize[0].blockSize))
        this.containerTopLeft = undefined
        break
      }
    }
  }

  private get pageWidthScaleFactor() {
    if (this._spreadMode !== SpreadMode.NONE && this._scrollMode !== ScrollMode.HORIZONTAL) {
      return 2
    }

    return 1
  }

  private setScale(value: string | number, options: {
    noScroll?: boolean
    preset?: boolean
    drawingDelay?: number
    origin?: any
  } = {
    noScroll: false,
    preset: false,
    drawingDelay: -1,
    origin: null,
  }) {
    let scale = typeof value === 'string' ? parseFloat(value) : value

    if (scale > 0) {
      options.preset = false
      this.setScaleUpdatePages(scale, value, options)
      return
    }

    const currentPage = this.pages[this._currentPageNumber - 1]

    if (!currentPage) {
      return
    }

    let hPadding = constants.SCROLLBAR_PADDING
    let vPadding = constants.VERTICAL_PADDING

    if (this.isInPresentationMode) {
      hPadding = vPadding = 4
      if (this._spreadMode !== SpreadMode.NONE) {
        hPadding *= 2
      }
    }
    else if (this.removePageBorders) {
      hPadding = vPadding = 0
    }
    else if (this._scrollMode === ScrollMode.HORIZONTAL) {
      [hPadding, vPadding] = [vPadding, hPadding]
    }

    const pageWidthScale = (this.container.clientWidth - hPadding) / currentPage.width * currentPage.scale / this.pageWidthScaleFactor
    const pageHeightScale = (this.container.clientHeight - vPadding) / currentPage.height * currentPage.scale

    switch (value) {
      case 'page-actual':
        scale = 1
        break
      case 'page-width':
        scale = pageWidthScale
        break
      case 'page-height':
        scale = pageHeightScale
        break
      case 'page-fit':
        scale = Math.min(pageWidthScale, pageHeightScale)
        break
      case 'auto': {
        const horizontalScale = isPortraitOrientation(currentPage) ? pageWidthScale : Math.min(pageHeightScale, pageWidthScale)
        scale = Math.min(constants.MAX_AUTO_SCALE, horizontalScale)
        break
      }
      default:
        console.error(`setScale: "${value}" is an unknown zoom value.`)
        return
    }

    options.preset = true
    this.setScaleUpdatePages(scale, value, options)
  }

  resetCurrentPage() {
    const page = this.pages[this._currentPageNumber - 1]

    if (this.isInPresentationMode) {
      this.setScale(this._currentScaleValue!, { noScroll: true })
    }

    this.scrollIntoView(page)
  }

  pageLabelToPageNumber(label?: string): null | number {
    if (!this.pageLabels || !label) {
      return null
    }

    const i = this.pageLabels.indexOf(label)

    if (i < 0) {
      return null
    }

    return i + 1
  }

  scrollPageIntoView({
    pageNumber,
    destArray = undefined,
    allowNegativeOffset = false,
    ignoreDestinationZoom = false,
  }: {
    pageNumber: number
    destArray?: any[]
    allowNegativeOffset?: boolean
    ignoreDestinationZoom?: boolean
  }) {
    if (!this.pdfDocument) return

    const page = Number.isInteger(pageNumber) && this.pages[pageNumber - 1]

    if (!page) {
      console.error(`scrollPageIntoView: "${pageNumber}" is not a valid pageNumber parameter.`)
      return
    }

    if (this.isInPresentationMode || !destArray) {
      this.setCurrentPageNumber(pageNumber, true)
      return
    }

    let x = 0
    let y = 0
    let width = 0
    let height = 0
    let widthScale
    let heightScale

    const changeOrientation = page.rotation % 180 !== 0
    const pageWidth = (changeOrientation ? page.height : page.width) / page.scale / PixelsPerInch.PDF_TO_CSS_UNITS
    const pageHeight = (changeOrientation ? page.width : page.height) / page.scale / PixelsPerInch.PDF_TO_CSS_UNITS

    let scale: string | number = 0
    switch (destArray[1].name) {
      case 'XYZ':
        x = destArray[2]
        y = destArray[3]
        scale = destArray[4]
        x = x !== null ? x : 0
        y = y !== null ? y : pageHeight
        break

      case 'Fit':
      case 'FitB':
        scale = 'page-fit'
        break

      case 'FitH':
      case 'FitBH':
        y = destArray[2]
        scale = 'page-width'
        if (y === null && this.location) {
          x = this.location.left
          y = this.location.top
        }
        else if (typeof y !== 'number' || y < 0) {
          y = pageHeight
        }
        break

      case 'FitV':
      case 'FitBV':
        x = destArray[2]
        width = pageWidth
        height = pageHeight
        scale = 'page-height'
        break

      case 'FitR': {
        x = destArray[2]
        y = destArray[3]
        width = destArray[4] - x
        height = destArray[5] - y

        let hPadding = constants.SCROLLBAR_PADDING
        let vPadding = constants.VERTICAL_PADDING

        if (this.removePageBorders) {
          hPadding = vPadding = 0
        }

        widthScale = (this.container.clientWidth - hPadding) / width / PixelsPerInch.PDF_TO_CSS_UNITS
        heightScale = (this.container.clientHeight - vPadding) / height / PixelsPerInch.PDF_TO_CSS_UNITS
        scale = Math.min(Math.abs(widthScale), Math.abs(heightScale))
        break
      }

      default:
        console.error(`scrollPageIntoView: "${destArray[1].name}" is not a valid destination type.`)
        return
    }

    if (!ignoreDestinationZoom) {
      if (scale && scale !== this._currentScale) {
        this.currentScaleValue = scale
      } else if (this._currentScale === constants.UNKNOWN_SCALE) {
        this.currentScaleValue = constants.DEFAULT_SCALE_VALUE
      }
    }

    if (scale === 'page-fit' && !destArray[4]) {
      this.scrollIntoView(page)
      return
    }

    const boundingRect = [page.viewport.convertToViewportPoint(x, y), page.viewport.convertToViewportPoint(x + width, y + height)]
    let left = Math.min(boundingRect[0][0], boundingRect[1][0])
    let top = Math.min(boundingRect[0][1], boundingRect[1][1])

    if (!allowNegativeOffset) {
      left = Math.max(left, 0)
      top = Math.max(top, 0)
    }

    this.scrollIntoView(page, { left, top })
  }

  private updateLocation(firstPage: VisiblePage) {
    const currentScale = this._currentScale
    const currentScaleValue = this._currentScaleValue ?? 0
    const normalizedScaleValue = parseFloat(currentScaleValue.toString()) === currentScale ? Math.round(currentScale * 10000) / 100 : currentScaleValue
    const pageNumber = firstPage.id
    const currentPage = this.pages[pageNumber - 1]
    const container = this.container
    const topLeft = currentPage.getPagePoint(container.scrollLeft - firstPage.x, container.scrollTop - firstPage.y)
    const intLeft = Math.round(topLeft[0])
    const intTop = Math.round(topLeft[1])
    let pdfOpenParams = `#page=${pageNumber}`

    if (!this.isInPresentationMode) {
      pdfOpenParams += `&zoom=${normalizedScaleValue},${intLeft},${intTop}`
    }

    this.location = {
      pageNumber,
      scale: normalizedScaleValue,
      top: intTop,
      left: intLeft,
      rotation: this._pagesRotation,
      pdfOpenParams,
    }
  }

  update() {
    const visible = this.getVisiblePages()

    if (visible.pages.length === 0) {
      return
    }

    const newCacheSize = Math.max(constants.DEFAULT_CACHE_SIZE, 2 * visible.pages.length + 1)

    this.buffer.resize(newCacheSize, visible.ids)
    this.renderingQueue.renderHighestPriority(visible)

    const isSimpleLayout = this._spreadMode === SpreadMode.NONE && (this._scrollMode === ScrollMode.PAGE || this._scrollMode === ScrollMode.VERTICAL)
    const currentId = this._currentPageNumber
    let stillFullyVisible = false

    for (const page of visible.pages) {
      if (page.percent < 100) {
        break
      }

      if (page.id === currentId && isSimpleLayout) {
        stillFullyVisible = true
        break
      }
    }

    this.setCurrentPageNumber(stillFullyVisible ? currentId : visible.pages[0].id)
    this.updateLocation(visible.first!)

    this.eventBus.dispatch('updateviewarea', {
      source: this,
      location: this.location,
    })
  }

  containsElement(element: Node | null) {
    return this.container.contains(element)
  }

  focus() {
    this.container.focus()
  }

  private get isContainerRtl() {
    return getComputedStyle(this.container).direction === 'rtl'
  }

  get isInPresentationMode() {
    return this.presentationModeState === PresentationModeState.FULLSCREEN
  }

  get isChangingPresentationMode() {
    return this.presentationModeState === PresentationModeState.CHANGING
  }

  get isHorizontalScrollbarEnabled() {
    return this.isInPresentationMode ? false : this.container.scrollWidth > this.container.clientWidth
  }

  get isVerticalScrollbarEnabled() {
    return this.isInPresentationMode ? false : this.container.scrollHeight > this.container.clientHeight
  }

  private getVisiblePages() {
    const pages = this._scrollMode === ScrollMode.PAGE ? this.scrollModePageState.pages : this.pages
    const horizontal = this._scrollMode === ScrollMode.HORIZONTAL
    const rtl = horizontal && this.isContainerRtl

    return getVisibleElements({
      scrollEl: this.container,
      pages,
      sortByVisibility: true,
      horizontal,
      rtl,
    })
  }

  cleanup() {
    for (const page of this.pages) {
      if (page.renderingState !== RenderingStates.FINISHED) {
        page.reset()
      }
    }
  }

  private cancelRendering() {
    for (const page of this.pages) {
      page.cancelRendering()
    }
  }

  private async ensurePdfPageLoaded(page: Page) {
    if (!this.pdfDocument) {
      return
    }

    if (page.pdfPage) {
      return page.pdfPage
    }

    try {
      const pdfPage = await this.pdfDocument.getPage(page.id)
      if (!page.pdfPage) {
        page.setPdfPage(pdfPage)
      }
      return pdfPage
    }
    catch (reason) {
      console.error('Unable to get page for page view', reason)
      return null
    }
  }

  private getScrollAhead(visible: VisibleElements) {
    if (visible.first?.id === 1) {
      return true
    } else if (visible.last?.id === this.pagesCount) {
      return false
    }

    switch (this._scrollMode) {
      case ScrollMode.PAGE:
        return this.scrollModePageState.scrollDown
      case ScrollMode.HORIZONTAL:
        return this.scroll.right
    }

    return this.scroll.down
  }

  forceRendering(currentlyVisiblePages?: VisibleElements) {
    const visiblePages = currentlyVisiblePages || this.getVisiblePages()
    const scrollAhead = this.getScrollAhead(visiblePages)
    const preRenderExtra = this._spreadMode !== SpreadMode.NONE && this._scrollMode !== ScrollMode.HORIZONTAL
    const page = this.renderingQueue.getHighestPriority(visiblePages, this.pages, scrollAhead, preRenderExtra)

    if (page) {
      this.ensurePdfPageLoaded(page).then(() => {
        this.renderingQueue.renderPage(page)
      })

      return true
    }

    return false
  }

  get hasEqualPageSizes() {
    const firstPage = this.pages[0]

    for (let i = 1, ii = this.pages.length; i < ii; ++i) {
      const page = this.pages[i]
      if (page.width !== firstPage.width || page.height !== firstPage.height) {
        return false
      }
    }

    return true
  }

  getPagesOverview() {
    let initialOrientation: boolean | null = null

    return this.pages.map((page) => {
      const viewport = page.pdfPage!.getViewport({ scale: 1 })
      const orientation = isPortraitOrientation(viewport)

      if (initialOrientation === null) {
        initialOrientation = orientation
      } else if (this.enablePrintAutoRotate && orientation !== initialOrientation) {
        return {
          width: viewport.height,
          height: viewport.width,
          rotation: (viewport.rotation - 90) % 360,
        }
      }

      return {
        width: viewport.width,
        height: viewport.height,
        rotation: viewport.rotation,
      }
    })
  }

  get optionalContentConfigPromise() {
    if (!this.pdfDocument) {
      return undefined
    }

    if (!this._optionalContentConfigPromise) {
      console.error('optionalContentConfigPromise: Not initialized yet.')

      return this.pdfDocument.getOptionalContentConfig({ intent: 'display' })
    }

    return this._optionalContentConfigPromise
  }

  set optionalContentConfigPromise(promise) {
    if (!(promise instanceof Promise)) {
      throw new Error(`Invalid optionalContentConfigPromise: ${promise}`)
    }

    if (!this.pdfDocument) {
      return
    }

    if (!this._optionalContentConfigPromise) {
      return
    }

    this._optionalContentConfigPromise = promise
    this.refresh(false, { optionalContentConfigPromise: promise })
    this.eventBus.dispatch('optionalcontentconfigchanged', {
      source: this,
      promise,
    })
  }

  get scrollMode() {
    return this._scrollMode
  }

  set scrollMode(mode: ScrollMode) {
    if (this._scrollMode === mode) {
      return
    }

    if (!isValidScrollMode(mode)) {
      throw new Error(`Invalid scroll mode: ${mode}`)
    }

    if (this.pagesCount > constants.FORCE_SCROLL_MODE_PAGE) {
      return
    }

    this.previousScrollMode = this._scrollMode
    this._scrollMode = mode

    this.eventBus.dispatch('scrollmodechanged', {
      source: this,
      mode,
    })

    this.updateScrollMode(this._currentPageNumber)
  }

  private updateScrollMode(pageNumber?: number) {
    const scrollMode = this._scrollMode

    this.viewerContainer.classList.toggle('scrollHorizontal', scrollMode === ScrollMode.HORIZONTAL)
    this.viewerContainer.classList.toggle('scrollWrapped', scrollMode === ScrollMode.WRAPPED)

    if (!this.pdfDocument || !pageNumber) {
      return
    }

    if (scrollMode === ScrollMode.PAGE) {
      this.ensurePageVisible()
    } else if (this.previousScrollMode === ScrollMode.PAGE) {
      this.updateSpreadMode()
    }

    if (this._currentScaleValue && isNaN(parseFloat(this._currentScaleValue.toString()))) {
      this.setScale(this._currentScaleValue, { noScroll: true })
    }

    this.setCurrentPageNumber(pageNumber, true)
    this.update()
  }

  private updateSpreadMode(pageNumber?: number) {
    if (!this.pdfDocument) {
      return
    }

    if (this._scrollMode === ScrollMode.PAGE) {
      this.ensurePageVisible()
    } else {
      this.viewerContainer.textContent = ''

      if (this._spreadMode === SpreadMode.NONE) {
        for (const page of this.pages) {
          this.viewerContainer.append(page.div)
        }

        return
      }

      const parity = this._spreadMode - 1
      let spread: Element | null = null
      
      for (let i = 0, ii = this.pages.length; i < ii; ++i) {
        if (spread === null) {
          spread = document.createElement("div");
          spread.className = "spread";
          this.viewerContainer.append(spread);
        } else if (i % 2 === parity) {
          spread = spread.cloneNode(false) as Element
          this.viewerContainer.append(spread)
        }

        spread!.append(this.pages[i].div)
      }
    }

    if (!pageNumber) {
      return
    }

    if (this._currentScaleValue && isNaN(parseFloat(this._currentScaleValue.toString()))) {
      this.setScale(this._currentScaleValue, { noScroll: true })
    }

    this.setCurrentPageNumber(pageNumber, true)
    this.update()
  }

  private getPageAdvance(currentPageNumber: number, previous: boolean = false) {
    switch (this._scrollMode) {
      case ScrollMode.WRAPPED:
      {
        const visible = this.getVisiblePages()
        const pageLayout = new Map()

        for (const view of visible.pages) {
          if (view.percent === 0 || view.widthPercent < 100) {
            continue
          }

          let yArray = pageLayout.get(view.y)

          if (!yArray) {
            pageLayout.set(view.y, yArray ||= [])
          }

          yArray.push(view.id)
        }

        for (const yArray of pageLayout.values()) {
          const currentIndex = yArray.indexOf(currentPageNumber)
          if (currentIndex === -1) {
            continue
          }

          const numPages = yArray.length
          if (numPages === 1) {
            break
          }

          if (previous) {
            for (let i = currentIndex - 1, ii = 0; i >= ii; i--) {
              const currentId = yArray[i],
                expectedId = yArray[i + 1] - 1
              if (currentId < expectedId) {
                return currentPageNumber - expectedId
              }
            }
          }
          else {
            for (let i = currentIndex + 1, ii = numPages; i < ii; i++) {
              const currentId = yArray[i],
                expectedId = yArray[i - 1] + 1
              if (currentId > expectedId) {
                return expectedId - currentPageNumber
              }
            }
          }

          if (previous) {
            const firstId = yArray[0]
            if (firstId < currentPageNumber) {
              return currentPageNumber - firstId + 1
            }
          }
          else {
            const lastId = yArray[numPages - 1]
            if (lastId > currentPageNumber) {
              return lastId - currentPageNumber + 1
            }
          }

          break
        }

        break
      }

      case ScrollMode.HORIZONTAL:
        break

      case ScrollMode.PAGE:
      case ScrollMode.VERTICAL:
      {
        if (this._spreadMode === SpreadMode.NONE) {
          break
        }

        const parity = this._spreadMode - 1
        if (previous && currentPageNumber % 2 !== parity) {
          break
        }
        else if (!previous && currentPageNumber % 2 === parity) {
          break
        }

        const visible = this.getVisiblePages()
        const expectedId = previous ? currentPageNumber - 1 : currentPageNumber + 1

        for (const view of visible.pages) {
          if (view.id !== expectedId) {
            continue
          }

          if (view.percent > 0 && view.widthPercent === 100) {
            return 2
          }

          break
        }

        break
      }
    }

    return 1
  }

  hasNextPage() {
    return this._currentPageNumber < this.pagesCount
  }

  hasPreviousPage() {
    return this._currentPageNumber > 1
  }

  nextPage() {
    if (!this.hasNextPage()) return false
    
    const advance = this.getPageAdvance(this._currentPageNumber, false) || 1
    this.currentPageNumber = Math.min(this._currentPageNumber + advance, this.pagesCount)

    return true
  }

  previousPage() {
    if (!this.hasPreviousPage()) return false

    const advance = this.getPageAdvance(this._currentPageNumber, true) || 1
    this.currentPageNumber = Math.max(this._currentPageNumber - advance, 1)

    return true
  }

  updateScale({ drawingDelay, scaleFactor, steps, origin }: UpdateScale) {
    if (steps === undefined && scaleFactor === undefined) {
      throw new Error('Invalid updateScale options: either `steps` or `scaleFactor` must be provided.')
    }

    if (!this.pdfDocument) {
      return
    }

    let newScale = this._currentScale

    if (scaleFactor && scaleFactor > 0 && scaleFactor !== 1) {
      newScale = Math.round(newScale * scaleFactor * 100) / 100
    }
    else if (steps) {
      const delta = steps > 0 ? constants.DEFAULT_SCALE_DELTA : 1 / constants.DEFAULT_SCALE_DELTA
      const round = steps > 0 ? Math.ceil : Math.floor
      steps = Math.abs(steps)

      do {
        newScale = round(newScale * delta * 10) / 10
      } while (--steps > 0)
    }

    newScale = Math.max(constants.MIN_SCALE, Math.min(constants.MAX_SCALE, newScale))

    this.setScale(newScale, {
      noScroll: false,
      drawingDelay,
      origin,
    })
  }

  increaseScale(options: UpdateScale = {}) {
    this.updateScale({
      ...options,
      steps: options.steps ?? 1,
    })
  }

  decreaseScale(options: UpdateScale = {}) {
    this.updateScale({
      ...options,
      steps: -(options.steps ?? 1),
    })
  }

  get annotationEditorMode() {
    // @ts-ignore
    return this.annotationEditorUIManager ? this._annotationEditorMode : AnnotationEditorType.DISABLE
  }

  set annotationEditorMode({ mode, editId, isFromKeyboard }: {
    mode: number
    editId?: string | null
    isFromKeyboard?: boolean
  }) {
    if (!this.annotationEditorUIManager) {
      throw new Error('The AnnotationEditor is not enabled.')
    }

    if (this._annotationEditorMode === mode) {
      return
    }

    if (!isValidAnnotationEditorMode(mode)) {
      throw new Error(`Invalid AnnotationEditor mode: ${mode}`)
    }

    if (!this.pdfDocument) {
      return
    }

    this._annotationEditorMode = mode
    this.eventBus.dispatch('annotationeditormodechanged', { source: this, mode })
    this.annotationEditorUIManager.updateMode(mode, editId, isFromKeyboard)
  }

  set annotationEditorParams({ type, value }: { type: number, value: unknown }) {
    if (!this.annotationEditorUIManager) {
      throw new Error('The AnnotationEditor is not enabled.')
    }

    this.annotationEditorUIManager.updateParams(type, value)
  }

  refresh(noUpdate: boolean = false, updateArgs: PageUpdate = {}) {
    if (!this.pdfDocument) {
      return
    }

    for (const page of this.pages) {
      page.update(updateArgs)
    }

    if (this.scaleTimeoutId) {
      clearTimeout(this.scaleTimeoutId)
      this.scaleTimeoutId = undefined
    }

    if (!noUpdate) {
      this.update()
    }
  }
}