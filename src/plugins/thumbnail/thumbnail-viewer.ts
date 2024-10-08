import { Dispatcher, type EventBus } from '@/bus'
import type { PDFDocumentProxy } from '@/pdfjs'
import { getVisibleElements, scrollIntoView, watchScroll, type VisibleElements } from '@/utils'
import { isValidRotation, Renderable, type RenderingQueue } from '@/viewer'
import { destroyTempCanvas } from './helpers'
import { Thumbnail } from './thumbnail'

const THUMBNAIL_SCROLL_MARGIN = -19
const THUMBNAIL_SELECTED_CLASS = 'selected'

export class ThumbnailViewer extends Dispatcher implements Renderable {
  private pdfDocument?: PDFDocumentProxy
  private thumbnails: Thumbnail[] = []
  private _pageLabels?: string[]
  private _pagesRotation
  private currentPageNumber = 1
  private scroll

  constructor(readonly options: {
    container: HTMLDivElement
    eventBus: EventBus
    renderingQueue?: RenderingQueue
    abortSignal?: AbortSignal
    enableHWA?: boolean
    pagesRotation?: number
  }) {
    super()

    this.scroll = watchScroll(
      this.options.container,
      this.forceRendering.bind(this),
      this.signal,
    )

    this.reset()
    this._pagesRotation = options.pagesRotation ?? 0

    this.on('rotationchanging', ({ pagesRotation }) => this.pagesRotation = pagesRotation)
    this.on('rendercleanup', () => this.cleanup())
  }

  get eventBus() {
    return this.options.eventBus
  }

  get signal() {
    return this.options.abortSignal
  }

  getThumbnail(index: number) {
    return this.thumbnails[index]
  }

  private getVisibleThumbs() {
    return getVisibleElements(this.options.container, this.thumbnails)
  }

  scrollIntoView(pageNumber: number) {
    if (!this.pdfDocument) {
      return
    }

    const thumbnail = this.thumbnails[pageNumber - 1]

    if (!thumbnail) {
      console.error('scrollIntoView: Invalid "pageNumber" parameter.')
      return
    }

    if (pageNumber !== this.currentPageNumber) {
      const prevThumbnail = this.thumbnails[this.currentPageNumber - 1]
      // Remove the highlight from the previous thumbnail...
      prevThumbnail.div.classList.remove(THUMBNAIL_SELECTED_CLASS)
      // ... and add the highlight to the new thumbnail.
      thumbnail.div.classList.add(THUMBNAIL_SELECTED_CLASS)
    }

    const { first, last, views } = this.getVisibleThumbs()

    // If the thumbnail isn't currently visible, scroll it into view.
    if (views.length > 0) {
      let shouldScroll = false

      if ((first && pageNumber <= first.id) || (last && pageNumber >= last.id)) {
        shouldScroll = true
      } else {
        for (const { id, percent } of views) {
          if (id !== pageNumber) {
            continue
          }
          shouldScroll = percent < 100
          break
        }
      }

      if (shouldScroll) {
        scrollIntoView(thumbnail.div, { top: THUMBNAIL_SCROLL_MARGIN })
      }
    }

    this.currentPageNumber = pageNumber
    this.forceRendering()
  }

  get pagesRotation() {
    return this._pagesRotation
  }

  set pagesRotation(rotation) {
    if (!isValidRotation(rotation)) {
      throw new Error('Invalid thumbnails rotation angle.')
    }

    if (!this.pdfDocument) {
      return
    }

    if (this._pagesRotation === rotation) {
      return // The rotation didn't change.
    }

    this._pagesRotation = rotation

    for (const thumbnail of this.thumbnails) {
      thumbnail.update({ rotation })
    }
  }

  cleanup() {
    if (!this.pdfDocument) {
      return
    }

    for (const thumbnail of this.thumbnails) {
      if (!thumbnail.isRenderingFinished) {
        thumbnail.reset()
      }
    }

    destroyTempCanvas()
  }

  destroy() {
    this.cleanup()
    this.reset()
  }

  private reset() {
    for (const thumbnail of this.thumbnails) {
      thumbnail.destroy()
    }

    this.pdfDocument = undefined
    this.thumbnails = []
    this.currentPageNumber = 1
    this.pageLabels = undefined
    this._pagesRotation = 0
    this.options.container.textContent = ''
  }

  setDocument(pdfDocument?: PDFDocumentProxy) {
    if (this.pdfDocument) {
      this.destroy()
    }

    this.pdfDocument = pdfDocument

    if (!pdfDocument) {
      return
    }

    const firstPagePromise = pdfDocument.getPage(1)
    const optionalContentConfigPromise = pdfDocument.getOptionalContentConfig({ intent: 'display' })

    firstPagePromise
      .then((firstPdfPage) => {
        const pagesCount = pdfDocument.numPages
        const viewport = firstPdfPage.getViewport({ scale: 1 })

        for (let pageNum = 1; pageNum <= pagesCount; ++pageNum) {
          const thumbnail = new Thumbnail({
            ...this.options,
            id: pageNum,
            viewport: viewport.clone(),
            rotation: this.pagesRotation,
            optionalContentConfigPromise,
          })

          this.thumbnails.push(thumbnail)
        }

        // Set the first `pdfPage` immediately, since it's already loaded,
        // rather than having to repeat the `PDFDocumentProxy.getPage` call in
        // the `this.ensurePdfPageLoaded` method before rendering can start.
        this.thumbnails[0]?.setPdfPage(firstPdfPage)

        // Ensure that the current thumbnail is always highlighted on load.
        const thumbnail = this.thumbnails[this.currentPageNumber - 1]
        thumbnail.div.classList.add(THUMBNAIL_SELECTED_CLASS)
      })
      .catch((reason) => {
        console.error('Unable to initialize thumbnail viewer', reason)
      })
  }

  get pageLabels() {
    return this._pageLabels
  }

  set pageLabels(labels: undefined | string[]) {
    if (!this.pdfDocument) {
      return
    }

    if (!labels) {
      this._pageLabels = undefined
    } else if (!(Array.isArray(labels) && this.pdfDocument.numPages === labels.length)) {
      this._pageLabels = undefined
      console.error('PDFThumbnailViewer_setPageLabels: Invalid page labels.')
    } else {
      this._pageLabels = labels
    }

    for (let i = 0, ii = this.thumbnails.length; i < ii; i++) {
      this.thumbnails[i].setPageLabel(this._pageLabels?.[i])
    }
  }

  private async ensurePdfPageLoaded(thumbnail: Thumbnail) {
    if (!this.pdfDocument) {
      return
    }

    if (thumbnail.pdfPage) {
      return thumbnail.pdfPage
    }

    try {
      const pdfPage = await this.pdfDocument.getPage(thumbnail.id)

      if (!thumbnail.pdfPage) {
        thumbnail.setPdfPage(pdfPage)
      }

      return pdfPage
    } catch (reason) {
      console.error('Unable to get page for thumbnail view', reason)
      return null // Page error -- there is nothing that can be done.
    }
  }

  private getScrollAhead(visible: VisibleElements) {
    if (visible.first?.id === 1) {
      return true
    } else if (visible.last?.id === this.thumbnails.length) {
      return false
    }

    return this.scroll.down
  }

  forceRendering() {
    const visibleThumbs = this.getVisibleThumbs()
    const scrollAhead = this.getScrollAhead(visibleThumbs)
    const thumbnail = this.options.renderingQueue?.getHighestPriority(
      visibleThumbs,
      this.thumbnails,
      scrollAhead,
    )

    if (thumbnail) {
      this.ensurePdfPageLoaded(thumbnail as Thumbnail).then(() => {
        this.options.renderingQueue?.renderView(thumbnail)
      })

      return true
    }

    return false
  }
}
