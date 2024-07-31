import { PixelsPerInch, AnnotationMode, RenderingCancelledException, AbortException, shadow } from './pdfjs'

import { DrawLayerBuilder } from './draw-layer-builder'
import { AnnotationEditorLayerBuilder } from './annotation-editor-layer-builder'
import { XfaLayerBuilder } from './xfa-layer-builder'
import { AnnotationLayerBuilder } from './annotation-layer-builder'
import { TextLayerBuilder } from './text-layer-builder'
import { StructTreeLayerBuilder } from './struct-tree-layer-builder'
import { TextAccessibilityManager } from './text-accessibility-manager'
import { TextHighlighter } from './text-highlighter'

import type { AnnotationEditorUIManager, RenderTask, PageViewport, PDFPageProxy, RenderingQueue, IL10n, IRenderableView, IPDFLinkService, IDownloadManager, FindController, OptionalContentConfig, AnnotationStorage, PageUpdate } from './types'
import { approximateFraction, roundToDivide, setLayerDimensions } from './utils'
import { RenderingStates, TextLayerMode } from './enums'
import { DEFAULT_SCALE } from './constants'

const LAYERS_ORDER = new Map([
  ['canvasWrapper', 0],
  ['textLayer', 1],
  ['annotationLayer', 2],
  ['annotationEditorLayer', 3],
  ['xfaLayer', 3],
])

export class Page implements IRenderableView {
  public readonly div: HTMLDivElement
  private hasRestrictedScaling: boolean = false
  private loadingId?: number
  private previousRotation?: number
  private renderError?: unknown
  private _renderingState: RenderingStates = RenderingStates.INITIAL
  private useThumbnailCanvas = {
    directDrawing: true,
    initialOptionalContent: true,
    regularAnnotations: true,
  }

  private viewportMap = new WeakMap()
  private layers: (Element | null)[] = [null, null, null, null]
  public pdfPage?: PDFPageProxy
  private annotationEditorLayer?: AnnotationEditorLayerBuilder
  private annotationLayer?: AnnotationLayerBuilder
  private accessibilityManager?: TextAccessibilityManager
  private drawLayer?: DrawLayerBuilder
  private textLayer?: TextLayerBuilder
  private xfaLayer?: XfaLayerBuilder
  private structTreeLayer?: StructTreeLayerBuilder
  private pdfPageRotate: number = 0
  public rotation: number = 0
  private zoomLayer?: any
  private canvas?: HTMLCanvasElement
  private pageLabel?: string
  private outputScale?: {
    sx: number
    sy: number
  }

  private renderTask?: RenderTask
  private annotationCanvasMap?: Map<string, HTMLCanvasElement>
  public resume: (() => void) | null = null

  constructor(
    public readonly id: number,
    private readonly layerProperties: {
      annotationEditorUIManager: AnnotationEditorUIManager
      annotationStorage: AnnotationStorage
      downloadManager: IDownloadManager
      enableScripting?: boolean
      fieldObjectsPromise?: Promise<{ [x: string]: Object[] } | null | undefined>
      findController: FindController
      hasJSActionsPromise?: Promise<boolean>
      linkService: IPDFLinkService
    },
    public viewport: PageViewport,
    private readonly eventBus: any,
    private readonly l10n: IL10n,
    private readonly container?: HTMLElement,
    public scale: number = DEFAULT_SCALE,
    private optionalContentConfigPromise?: Promise<OptionalContentConfig>,
    private readonly imageResourcesPath: string = '',
    private readonly renderingQueue?: RenderingQueue,
    private readonly maxCanvasPixels: number = 2 ** 25,
    private readonly pageColors?: { foreground: string, background: string },
    private readonly annotationMode: number = AnnotationMode.ENABLE_FORMS,
    private readonly textLayerMode: TextLayerMode = TextLayerMode.ENABLE,
  ) {
    this.pdfPageRotate = viewport.rotation

    const div = this.div = document.createElement('div')
    div.className = 'page'
    div.setAttribute('data-page-number', this.id.toString())
    div.setAttribute('role', 'region')
    div.setAttribute('data-l10n-id', 'pdfjs-page-landmark')
    div.setAttribute('data-l10n-args', JSON.stringify({ page: this.id }))
    this.setDimensions()
    container?.append(div)

    if (this.isStandalone) {
      container?.style.setProperty('--scale-factor', String(this.scale * PixelsPerInch.PDF_TO_CSS_UNITS))

      if (optionalContentConfigPromise) {
        optionalContentConfigPromise.then((optionalContentConfig: OptionalContentConfig) => {
          if (optionalContentConfigPromise !== this.optionalContentConfigPromise) {
            return
          }

          this.useThumbnailCanvas.initialOptionalContent = optionalContentConfig.hasInitialVisibility
        })
      }

      if (!l10n) {
        this.l10n.translate(this.div)
      }
    }
  }

  get renderingId() {
    return `page${this.id}`
  }

  get renderingState() {
    return this._renderingState
  }

  set renderingState(state) {
    if (state === this.renderingState) return

    this._renderingState = state

    if (this.loadingId) {
      clearTimeout(this.loadingId)
      this.loadingId = undefined
    }

    switch (state) {
      case RenderingStates.PAUSED:
        this.div.classList.remove('loading')
        break
      case RenderingStates.RUNNING:
        this.div.classList.add('loadingIcon')
        this.loadingId = setTimeout(() => {
          this.div.classList.add('loading')
          this.loadingId = undefined
        }, 0)
        break
      case RenderingStates.INITIAL:
      case RenderingStates.FINISHED:
        this.div.classList.remove('loadingIcon', 'loading')
        break
    }
  }

  get width() {
    return this.viewport.width
  }

  get height() {
    return this.viewport.height
  }

  private get isStandalone() {
    return !this.renderingQueue?.hasViewer
  }

  get _textHighlighter() {
    return shadow(this, '_textHighlighter', new TextHighlighter(
      this.layerProperties.findController,
      this.eventBus,
      this.id - 1,
    ))
  }

  private setDimensions() {
    if (this.pdfPage) {
      if (this.previousRotation === this.viewport.rotation) {
        return
      }

      this.previousRotation = this.viewport.rotation
    }

    setLayerDimensions(
      this.div,
      this.viewport,
      true,
      false,
    )
  }

  setPdfPage(pdfPage: PDFPageProxy) {
    if (this.isStandalone && (this.pageColors?.foreground === 'CanvasText' || this.pageColors?.background === 'Canvas')) {
      // @ts-ignore
      this.container?.style.setProperty('--hcm-highlight-filter', pdfPage.filterFactory.addHighlightHCMFilter('highlight', 'CanvasText', 'Canvas', 'HighlightText', 'Highlight'))
      // @ts-ignore
      this.container?.style.setProperty('--hcm-highlight-selected-filter', pdfPage.filterFactory.addHighlightHCMFilter('highlight_selected', 'CanvasText', 'Canvas', 'HighlightText', 'Highlight'))
    }

    this.pdfPage = pdfPage
    this.pdfPageRotate = pdfPage.rotate

    const totalRotation = (this.rotation + this.pdfPageRotate) % 360

    this.viewport = pdfPage.getViewport({
      scale: this.scale * PixelsPerInch.PDF_TO_CSS_UNITS,
      rotation: totalRotation,
    })

    this.setDimensions()
    this.reset()
  }

  destroy() {
    this.reset()
    this.pdfPage?.cleanup()
  }

  private async renderAnnotationLayer() {
    let error = null

    try {
      await this.annotationLayer?.render(this.viewport, 'display')
    }
    catch (ex) {
      console.error(`renderAnnotationLayer: '${ex}'.`)
      error = ex
    }
    finally {
      this.eventBus.dispatch('annotationlayerrendered', {
        source: this,
        pageNumber: this.id,
        error,
      })
    }
  }

  private renderAnnotationEditorLayer() {
    let error = null

    try {
      this.annotationEditorLayer?.render(this.viewport, 'display')
    }
    catch (ex) {
      console.error(`renderAnnotationEditorLayer: '${ex}'.`)
      error = ex
    }
    finally {
      this.eventBus.dispatch('annotationeditorlayerrendered', {
        source: this,
        pageNumber: this.id,
        error,
      })
    }
  }

  private async renderDrawLayer() {
    try {
      await this.drawLayer?.render('display')
    }
    catch (ex) {
      console.error(`renderDrawLayer: '${ex}'.`)
    }
  }

  private async renderXfaLayer() {
    let error = null

    try {
      const result = await this.xfaLayer?.render(this.viewport, 'display')
      if (result?.textDivs && this._textHighlighter) {
        this.buildXfaTextContentItems(result.textDivs)
      }
    }
    catch (ex) {
      console.error(`renderXfaLayer: '${ex}'.`)
      error = ex
    }
    finally {
      if (this.xfaLayer?.div) {
        this.l10n.pause()
        this.addLayer(this.xfaLayer.div, 'xfaLayer')
        this.l10n.resume()
      }

      this.eventBus.dispatch('xfalayerrendered', {
        source: this,
        pageNumber: this.id,
        error,
      })
    }
  }

  private async renderTextLayer() {
    if (!this.textLayer) return

    let error = null

    try {
      await this.textLayer.render(this.viewport)
    }
    catch (ex) {
      if (ex instanceof AbortException) {
        return
      }

      console.error(`renderTextLayer: '${ex}'.`)
      error = ex
    }

    this.eventBus.dispatch('textlayerrendered', {
      source: this,
      pageNumber: this.id,
      error,
    })

    this.renderStructTreeLayer()
  }

  private async renderStructTreeLayer() {
    if (!this.textLayer) return

    this.structTreeLayer ||= new StructTreeLayerBuilder()

    const tree = await (!this.structTreeLayer.renderingDone ? this.pdfPage?.getStructTree() : undefined)
    const treeDom = this.structTreeLayer?.render(tree)

    if (treeDom) {
      this.l10n.pause()
      this.canvas?.append(treeDom)
      this.l10n.resume()
    }

    this.structTreeLayer?.show()
  }

  private async buildXfaTextContentItems(textDivs: Text[]) {
    const text = await this.pdfPage?.getTextContent()
    if (!text) return

    const items = []

    for (const item of text.items) {
      // @ts-ignore
      items.push(item.str)
    }

    this._textHighlighter.setTextMapping(textDivs, items)
    this._textHighlighter.enable()
  }

  private resetZoomLayer(removeFromDOM = false) {
    if (!this.zoomLayer) return

    const zoomLayerCanvas = this.zoomLayer.firstChild
    this.viewportMap.delete(zoomLayerCanvas)
    zoomLayerCanvas.width = 0
    zoomLayerCanvas.height = 0

    if (removeFromDOM) this.zoomLayer.remove()

    this.zoomLayer = undefined
  }

  reset({
    keepZoomLayer = false,
    keepAnnotationLayer = false,
    keepAnnotationEditorLayer = false,
    keepXfaLayer = false,
    keepTextLayer = false,
  } = {}) {
    this.cancelRendering({
      keepAnnotationLayer,
      keepAnnotationEditorLayer,
      keepXfaLayer,
      keepTextLayer,
    })

    this.renderingState = RenderingStates.INITIAL

    const div = this.div
    const childNodes = div.childNodes
    const zoomLayerNode = (keepZoomLayer && this.zoomLayer) || null
    const annotationLayerNode = (keepAnnotationLayer && this.annotationLayer?.div) || null
    const annotationEditorLayerNode = (keepAnnotationEditorLayer && this.annotationEditorLayer?.div) || null
    const xfaLayerNode = (keepXfaLayer && this.xfaLayer?.div) || null
    const textLayerNode = (keepTextLayer && this.textLayer?.div) || null

    for (let i = childNodes.length - 1; i >= 0; i--) {
      const node = childNodes[i]
      switch (node) {
        case zoomLayerNode:
        case annotationLayerNode:
        case annotationEditorLayerNode:
        case xfaLayerNode:
        case textLayerNode:
          continue
      }

      node.remove()

      const layerIndex = this.layers.indexOf(node as Element)

      if (layerIndex >= 0) {
        this.layers[layerIndex] = null
      }
    }

    div.removeAttribute('data-loaded')

    if (annotationLayerNode) this.annotationLayer?.hide()
    if (annotationEditorLayerNode) this.annotationEditorLayer?.hide()
    if (xfaLayerNode) this.xfaLayer?.hide()
    if (textLayerNode) this.textLayer?.hide()

    this.structTreeLayer?.hide()

    if (!zoomLayerNode) {
      if (this.canvas) {
        this.viewportMap.delete(this.canvas)
        this.canvas.width = 0
        this.canvas.height = 0

        delete this.canvas
      }

      this.resetZoomLayer()
    }
  }

  async update({ scale = 0, rotation, optionalContentConfigPromise, drawingDelay = -1 }: PageUpdate) {
    this.scale = scale || this.scale

    if (typeof rotation === 'number') {
      this.rotation = rotation
    }

    if (optionalContentConfigPromise instanceof Promise) {
      this.optionalContentConfigPromise = optionalContentConfigPromise

      optionalContentConfigPromise.then((optionalContentConfig) => {
        if (optionalContentConfigPromise !== this.optionalContentConfigPromise) {
          return
        }

        this.useThumbnailCanvas.initialOptionalContent = optionalContentConfig.hasInitialVisibility
      })
    }

    this.useThumbnailCanvas.directDrawing = true
    const totalRotation = (this.rotation + this.pdfPageRotate) % 360

    this.viewport = this.viewport.clone({
      scale: this.scale * PixelsPerInch.PDF_TO_CSS_UNITS,
      rotation: totalRotation,
    })

    this.setDimensions()

    if (this.isStandalone) {
      this.container?.style.setProperty('--scale-factor', this.viewport.scale.toString())
    }

    if (this.canvas) {
      let onlyCssZoom = false

      if (this.hasRestrictedScaling) {
        if (this.maxCanvasPixels === 0) {
          onlyCssZoom = true
        }
        else if (this.maxCanvasPixels > 0) {
          onlyCssZoom = (Math.floor(this.viewport.width) * this.outputScale!.sx | 0)
          * (Math.floor(this.viewport.height) * this.outputScale!.sy | 0) > this.maxCanvasPixels
        }
      }

      const postponeDrawing = drawingDelay >= 0 && drawingDelay < 1000

      if (postponeDrawing || onlyCssZoom) {
        if (postponeDrawing && !onlyCssZoom && this.renderingState !== RenderingStates.FINISHED) {
          this.cancelRendering({
            keepAnnotationLayer: true,
            keepAnnotationEditorLayer: true,
            keepXfaLayer: true,
            keepTextLayer: true,
            cancelExtraDelay: drawingDelay,
          })
          this.renderingState = RenderingStates.FINISHED
          this.useThumbnailCanvas.directDrawing = false
        }

        this.cssTransform(
          this.canvas,
          true,
          true,
          true,
          !postponeDrawing,
          postponeDrawing,
        )

        if (postponeDrawing) {
          return
        }

        this.eventBus.dispatch('pagerendered', {
          source: this,
          pageNumber: this.id,
          cssTransform: true,
          timestamp: performance.now(),
          error: this.renderError,
        })

        return
      }

      if (!this.zoomLayer && !this.canvas.hidden) {
        this.zoomLayer = this.canvas.parentNode
        this.zoomLayer.style.position = 'absolute'
      }
    }

    if (this.zoomLayer) {
      this.cssTransform(this.zoomLayer.firstChild)
    }

    this.reset({
      keepZoomLayer: true,
      keepAnnotationLayer: true,
      keepAnnotationEditorLayer: true,
      keepXfaLayer: true,
      keepTextLayer: true,
    })
  }

  cancelRendering({
    keepAnnotationLayer = false,
    keepAnnotationEditorLayer = false,
    keepXfaLayer = false,
    keepTextLayer = false,
    cancelExtraDelay = 0,
  } = {}) {
    if (this.renderTask) {
      this.renderTask.cancel(cancelExtraDelay)
      this.renderTask = undefined
    }

    this.resume = null

    if (this.textLayer && (!keepTextLayer || !this.textLayer.div)) {
      this.textLayer.cancel()
      this.textLayer = undefined
    }

    if (this.structTreeLayer && !this.textLayer) {
      this.structTreeLayer = undefined
    }

    if (this.annotationLayer && (!keepAnnotationLayer || !this.annotationLayer.div)) {
      this.annotationLayer.cancel()
      this.annotationLayer = undefined
      this.annotationCanvasMap = undefined
    }

    if (this.annotationEditorLayer && (!keepAnnotationEditorLayer || !this.annotationEditorLayer.div)) {
      if (this.drawLayer) {
        this.drawLayer.cancel()
        this.drawLayer = undefined
      }

      this.annotationEditorLayer.cancel()
      this.annotationEditorLayer = undefined
    }

    if (this.xfaLayer && (!keepXfaLayer || !this.xfaLayer.div)) {
      this.xfaLayer.cancel()
      this.xfaLayer = undefined
      this._textHighlighter?.disable()
    }
  }

  cssTransform(
    target: HTMLElement,
    redrawAnnotationLayer: boolean = false,
    redrawAnnotationEditorLayer: boolean = false,
    redrawXfaLayer: boolean = false,
    redrawTextLayer: boolean = false,
    hideTextLayer: boolean = false,
  ) {
    if (!target.hasAttribute('zooming')) {
      target.setAttribute('zooming', 'true')
      target.style.width = target.style.height = ''
    }

    const originalViewport = this.viewportMap.get(target)

    if (this.viewport !== originalViewport) {
      const relativeRotation = this.viewport.rotation - originalViewport.rotation
      const absRotation = Math.abs(relativeRotation)

      let scaleX = 1
      let scaleY = 1

      if (absRotation === 90 || absRotation === 270) {
        scaleX = this.viewport.height / this.viewport.width
        scaleY = this.viewport.width / this.viewport.height
      }
      target.style.transform = `rotate(${relativeRotation}deg) scale(${scaleX}, ${scaleY})`
    }

    if (redrawAnnotationLayer && this.annotationLayer) {
      this.renderAnnotationLayer()
    }

    if (redrawAnnotationEditorLayer && this.annotationEditorLayer) {
      if (this.drawLayer) {
        this.renderDrawLayer()
      }

      this.renderAnnotationEditorLayer()
    }

    if (redrawXfaLayer && this.xfaLayer) {
      this.renderXfaLayer()
    }

    if (this.textLayer) {
      if (hideTextLayer) {
        this.textLayer.hide()
        this.structTreeLayer?.hide()
      }
      else if (redrawTextLayer) {
        this.renderTextLayer()
      }
    }
  }

  getPagePoint(x: number, y: number) {
    return this.viewport.convertToPdfPoint(x, y)
  }

  private async finishRenderTask(renderTask: RenderTask, error?: unknown) {
    if (renderTask === this.renderTask) {
      this.renderTask = undefined
    }

    if (error instanceof RenderingCancelledException) {
      this.renderError = null
      return
    }

    this.renderError = error
    this.renderingState = RenderingStates.FINISHED
    this.resetZoomLayer(true)
    this.useThumbnailCanvas.regularAnnotations = !renderTask.separateAnnots

    this.eventBus.dispatch('pagerendered', {
      source: this,
      pageNumber: this.id,
      cssTransform: false,
      timestamp: performance.now(),
      error: this.renderError,
    })

    if (error) {
      throw error
    }
  }

  async draw() {
    if (this.renderingState !== RenderingStates.INITIAL) {
      console.error('Must be in new state before drawing')
      this.reset()
    }
    
    if (!this.pdfPage) {
      this.renderingState = RenderingStates.FINISHED
      throw new Error('pdfPage is not loaded')
    }

    this.renderingState = RenderingStates.RUNNING
    const canvasWrapper = document.createElement('div')
    canvasWrapper.classList.add('canvasWrapper')
    this.addLayer(canvasWrapper, 'canvasWrapper')

    if (!this.textLayer && this.textLayerMode !== TextLayerMode.DISABLE && !this.pdfPage.isPureXfa) {
      this.accessibilityManager ||= new TextAccessibilityManager()

      this.textLayer = new TextLayerBuilder({
        pdfPage: this.pdfPage,
        highlighter: this._textHighlighter,
        accessibilityManager: this.accessibilityManager,
        enablePermissions: this.textLayerMode === TextLayerMode.ENABLE_PERMISSIONS,
        onAppend: (textLayerDiv) => {
          this.l10n?.pause()
          this.addLayer(textLayerDiv, 'textLayer')
          this.l10n?.resume()
        },
      })
    }

    if (!this.annotationLayer && this.annotationMode !== AnnotationMode.DISABLE) {
      this.annotationCanvasMap ||= new Map()
      this.annotationLayer = new AnnotationLayerBuilder({
        pdfPage: this.pdfPage,
        linkService: this.layerProperties.linkService,
        eventBus: this.eventBus,
        downloadManager: this.layerProperties.downloadManager,
        annotationStorage: this.layerProperties.annotationStorage,
        imageResourcesPath: this.imageResourcesPath,
        renderForms: this.annotationMode === AnnotationMode.ENABLE_FORMS,
        enableScripting: this.layerProperties.enableScripting,
        hasJSActionsPromise: this.layerProperties.hasJSActionsPromise,
        fieldObjectsPromise: this.layerProperties.fieldObjectsPromise,
        annotationCanvasMap: this.annotationCanvasMap,
        accessibilityManager: this.accessibilityManager,
        annotationEditorUIManager: this.layerProperties.annotationEditorUIManager,
        onAppend: annotationLayerDiv => this.addLayer(annotationLayerDiv, 'annotationLayer'),
      })
    }

    const renderContinueCallback = (cont: () => void) => {
      showCanvas?.(false)

      if (this.renderingQueue && !this.renderingQueue.isHighestPriority(this)) {
        this.renderingState = RenderingStates.PAUSED

        this.resume = () => {
          this.renderingState = RenderingStates.RUNNING
          cont()
        }

        return
      }

      cont()
    }

    const canvas = document.createElement('canvas')
    canvas.setAttribute('role', 'presentation')
    canvas.hidden = true

    const hasHCM = !!(this.pageColors?.background && this.pageColors?.foreground)

    let showCanvas: undefined | ((isLastShow: boolean) => void) = (isLastShow: boolean) => {
      if (!hasHCM || isLastShow) {
        canvas.hidden = false
        showCanvas = undefined
      }
    }

    canvasWrapper.append(canvas)
    this.canvas = canvas

    const ctx = canvas.getContext('2d', {
      alpha: false,
      willReadFrequently: true,
    })

    const outputScale = this.outputScale = {
      sx: window.devicePixelRatio || 1,
      sy: window.devicePixelRatio || 1,
    }

    if (this.maxCanvasPixels === 0) {
      const invScale = 1 / this.scale
      outputScale.sx *= invScale
      outputScale.sy *= invScale
      this.hasRestrictedScaling = true
    }
    else if (this.maxCanvasPixels > 0) {
      const pixelsInViewport = this.viewport.width * this.viewport.height
      const maxScale = Math.sqrt(this.maxCanvasPixels / pixelsInViewport)

      if (outputScale.sx > maxScale || outputScale.sy > maxScale) {
        outputScale.sx = maxScale
        outputScale.sy = maxScale
        this.hasRestrictedScaling = true
      }
      else {
        this.hasRestrictedScaling = false
      }
    }

    const sfx = approximateFraction(outputScale.sx)
    const sfy = approximateFraction(outputScale.sy)
    canvas.width = roundToDivide(this.viewport.width * outputScale.sx, sfx[0])
    canvas.height = roundToDivide(this.viewport.height * outputScale.sy, sfy[0])
    canvas.style.width = roundToDivide(this.viewport.width, sfx[1]) + 'px'
    canvas.style.height = roundToDivide(this.viewport.height, sfy[1]) + 'px'
    this.viewportMap.set(canvas, this.viewport)

    const renderTask = this.renderTask = this.pdfPage.render({
      canvasContext: ctx!,
      transform: outputScale.sx !== 1 || outputScale.sy !== 1 ? [outputScale.sx, 0, 0, outputScale.sy, 0, 0] : undefined,
      viewport: this.viewport,
      annotationMode: this.annotationMode,
      optionalContentConfigPromise: this.optionalContentConfigPromise,
      annotationCanvasMap: this.annotationCanvasMap,
      pageColors: this.pageColors,
    })

    renderTask.onContinue = renderContinueCallback

    const resultPromise = renderTask.promise.then(async () => {
      showCanvas?.(true)
      await this.finishRenderTask(renderTask)
      this.renderTextLayer()

      if (this.annotationLayer) {
        await this.renderAnnotationLayer()
      }

      if (!this.layerProperties.annotationEditorUIManager) {
        return
      }

      this.drawLayer ||= new DrawLayerBuilder(this.id)
      await this.renderDrawLayer()
      this.drawLayer.setParent(canvasWrapper)

      if (!this.annotationEditorLayer) {
        this.annotationEditorLayer = new AnnotationEditorLayerBuilder({
          uiManager: this.layerProperties.annotationEditorUIManager,
          pdfPage: this.pdfPage!,
          l10n: this.l10n,
          accessibilityManager: this.accessibilityManager,
          annotationLayer: this.annotationLayer?.annotationLayer,
          textLayer: this.textLayer,
          drawLayer: this.drawLayer.getDrawLayer()!,
          onAppend: annotationEditorLayerDiv => this.addLayer(annotationEditorLayerDiv, 'annotationEditorLayer'),
        })
      }

      this.renderAnnotationEditorLayer()
    }, (error) => {
      if (!(error instanceof RenderingCancelledException)) {
        showCanvas?.(true)
      }

      return this.finishRenderTask(renderTask, error)
    })

    if (this.pdfPage.isPureXfa) {
      if (!this.xfaLayer) {
        this.xfaLayer = new XfaLayerBuilder(
          this.pdfPage,
          this.layerProperties.annotationStorage,
          this.layerProperties.linkService,
        )
      }

      this.renderXfaLayer()
    }

    this.div.setAttribute('data-loaded', 'true')

    this.eventBus.dispatch('pagerender', {
      source: this,
      pageNumber: this.id,
    })

    return resultPromise
  }

  setPageLabel(label?: string) {
    this.pageLabel = typeof label === 'string' ? label : undefined

    this.div.setAttribute(
      'data-l10n-args',
      JSON.stringify({ page: this.pageLabel ?? this.id }),
    )

    if (this.pageLabel !== undefined) {
      this.div.setAttribute('data-page-label', this.pageLabel)
    }
    else {
      this.div.removeAttribute('data-page-label')
    }
  }

  get thumbnailCanvas() {
    const { directDrawing, initialOptionalContent, regularAnnotations } = this.useThumbnailCanvas

    return directDrawing && initialOptionalContent && regularAnnotations ? this.canvas : null
  }

  private addLayer(div: HTMLElement, name: string) {
    const pos = LAYERS_ORDER.get(name) ?? 0
    const oldDiv = this.layers[pos]

    this.layers[pos] = div

    if (oldDiv) {
      oldDiv.replaceWith(div)
      return
    }

    for (let i = pos - 1; i >= 0; i--) {
      const layer = this.layers[i]

      if (layer) {
        layer.after(div)
        return
      }
    }

    this.div.prepend(div)
  }
}
