import type { EventBus } from '@/bus'
import type { OptionalContentConfig, PageViewport } from '@/pdfjs'
import { createElement } from '@/utils'
import { type Page, type RenderingQueue, RenderView } from '@/viewer'
import { createScaledCanvasContext, reduceImage } from './helpers'
import { ThumbnailLayerBuilder } from './thumbnail-layer-builder'

const DRAW_UPSCALE_FACTOR = 2
const MAX_NUM_SCALING_STEPS = 3
const THUMBNAIL_WIDTH = 100

export class Thumbnail extends RenderView {
  private readonly anchor = createElement('a')
  private readonly placeholderImg = createElement('div', 'thumbnailImage')
  private pageLabel?: string
  private image?: HTMLImageElement
  private canvas?: HTMLCanvasElement
  private canvasWidth = 0
  private canvasHeight = 0

  resume: (() => void) | null = null

  constructor(readonly options: {
    container: HTMLDivElement
    eventBus: EventBus
    id: number
    viewport: PageViewport
    scale?: number
    rotation?: number
    renderingQueue?: RenderingQueue
    optionalContentConfigPromise?: Promise<OptionalContentConfig>
    enableHWA?: boolean
  }) {
    super(options)

    this.anchor.setAttribute('data-l10n-id', 'pdfjs-thumb-page-title')
    this.anchor.setAttribute('data-l10n-args', this.pageL10nArgs)
    this.anchor.addEventListener('click', () => this.dispatch('thumbnailclick', options.id))

    this.div.append(this.placeholderImg)
    this.anchor.append(this.div)
    options.container.append(this.anchor)
  }

  protected updateDimensions() {
    this.canvasWidth = THUMBNAIL_WIDTH
    this.canvasHeight = (this.canvasWidth / (this.viewport.width / this.viewport.height)) | 0
    this._scale = this.canvasWidth / this.viewport.width

    this.div.style.setProperty('--thumbnail-width', `${this.canvasWidth}px`)
    this.div.style.setProperty('--thumbnail-height', `${this.canvasHeight}px`)
  }

  protected setViewport(scale?: number, clone?: boolean) {
    super.setViewport(scale ?? 1, clone)
  }

  destroy() {
    this.cancelRendering()

    this.anchor.remove()
    this.placeholderImg.remove()
    this.image?.remove()
    this.image = undefined

    this.canvas?.remove()
    this.canvas = undefined
  }

  reset() {
    super.reset()

    this.image?.replaceWith(this.placeholderImg)
    this.updateDimensions()
    this.image?.removeAttribute('src')

    delete this.image
  }

  update({ rotation }: { rotation?: number }) {
    if (typeof rotation === 'number') {
      this._rotation = rotation // The rotation may be zero.
    }

    this.setViewport(1, true)
    this.reset()
  }

  private convertCanvasToImage(canvas: HTMLCanvasElement) {
    if (!this.isRenderingFinished) {
      throw new Error('convertCanvasToImage: Rendering has not finished.')
    }

    const { ctx, canvas: pageDrawCanvas } = createScaledCanvasContext(this.canvasWidth, this.canvasHeight, 1, true)
    const reducedCanvas = reduceImage(canvas, ctx, pageDrawCanvas, MAX_NUM_SCALING_STEPS)

    this.image = createElement('img', 'thumbnailImage', {
      'src': reducedCanvas.toDataURL(),
      'data-l10n-id': 'pdfjs-thumb-page-canvas',
      'data-l10n-args': this.pageL10nArgs,
    })

    this.div.setAttribute('data-loaded', 'true')
    this.placeholderImg.replaceWith(this.image)

    reducedCanvas.width = 0
    reducedCanvas.height = 0
  }

  markAsRenderingFinished(dispatchEvent = true) {
    super.markAsRenderingFinished(dispatchEvent)

    if (this.canvas) {
      this.convertCanvasToImage(this.canvas)
    }
  }

  protected async render() {
    const { ctx, canvas, transform } = createScaledCanvasContext(
      this.canvasWidth,
      this.canvasHeight,
      DRAW_UPSCALE_FACTOR,
      this.options.enableHWA,
    )

    this.canvas = canvas

    return this.pdfPage!.render({
      canvasContext: ctx!,
      transform,
      viewport: this.viewport.clone({ scale: DRAW_UPSCALE_FACTOR * this.scale }),
      optionalContentConfigPromise: this.options.optionalContentConfigPromise,
    })
  }

  setImage(page: Page) {
    if (!this.isRenderingInitial) {
      return
    }

    const canvas = page.layersPage.find<ThumbnailLayerBuilder>(ThumbnailLayerBuilder)?.thumbnailCanvas

    if (!canvas) {
      return
    }

    if (!this.pdfPage && page.pdfPage) {
      this.setPdfPage(page.pdfPage)
    }

    if (page.scale < this.scale) {
      return
    }

    this.markAsRenderingFinished(false)
    this.convertCanvasToImage(canvas)
  }

  get pageL10nArgs() {
    return JSON.stringify({ page: this.pageLabel ?? this.id })
  }

  setPageLabel(label?: string) {
    this.pageLabel = typeof label === 'string' ? label : undefined
    this.anchor.setAttribute('data-l10n-args', this.pageL10nArgs)

    if (!this.isRenderingFinished) {
      return
    }

    this.image?.setAttribute('data-l10n-args', this.pageL10nArgs)
  }
}
