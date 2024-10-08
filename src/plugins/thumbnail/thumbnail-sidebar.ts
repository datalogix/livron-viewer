import { RenderingStates } from '@/enums'
import { SidebarItem } from '@/toolbar'
import { createElement } from '@/utils'
import { ThumbnailViewer } from './thumbnail-viewer'

export class ThumbnailSidebar extends SidebarItem {
  protected thumbnailViewer?: ThumbnailViewer

  build() {
    const container = createElement('div', 'thumbnail-sidebar')

    this.thumbnailViewer = new ThumbnailViewer({
      container,
      eventBus: this.eventBus,
      renderingQueue: this.viewer.renderManager.renderingQueue,
      abortSignal: this.signal,
      enableHWA: this.viewer.options.enableHWA,
      pagesRotation: this.viewer.rotationManager.pagesRotation,
    })

    this.viewer.renderManager.renderingQueue.registerHandler(() => {
      return this.opened && this.thumbnailViewer?.forceRendering()
    })

    this.on('documentinit', () => this.thumbnailViewer?.setDocument(this.viewer.getDocument()))
    this.on('documentdestroy', () => this.thumbnailViewer?.destroy())
    this.on('pagechanging', ({ pageNumber }) => this.onPageChanging(pageNumber))
    this.on('thumbnailrendered', ({ pageNumber }) => this.onThumbnailRendered(pageNumber))

    this.thumbnailViewer?.setDocument(this.viewer.getDocument())

    return container
  }

  private onPageChanging(pageNumber: number) {
    if (this.opened && this.thumbnailViewer) {
      this.thumbnailViewer.scrollIntoView(pageNumber)
    }
  }

  private onThumbnailRendered(pageNumber: number) {
    const page = this.viewer.getPage(pageNumber - 1)

    if (!this.viewer.renderManager.buffer.has(page)) {
      page.pdfPage?.cleanup()
    }
  }

  show() {
    super.show()

    queueMicrotask(() => {
      if (!this.thumbnailViewer) return

      for (const page of this.viewer.getCachedPages()) {
        if (page.renderingState === RenderingStates.FINISHED) {
          this.thumbnailViewer.getThumbnail(page.id - 1)?.setImage(page)
        }
      }

      this.thumbnailViewer.scrollIntoView(this.viewer.currentPageNumber)
    })
  }

  protected destroy() {
    this.thumbnailViewer?.destroy()
    this.thumbnailViewer = undefined
  }
}
