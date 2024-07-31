import type { Viewer, Page, VisibleElements, ThumbnailViewer } from './types'
import { RenderingCancelledException } from './pdfjs'
import { RenderingStates } from './enums'

export class RenderingQueue {
  private viewer?: Viewer
  private thumbnailViewer?: ThumbnailViewer
  private highestPriorityPage?: string
  private idleTimeout?: number
  public printing: boolean = false
  public onIdle?: () => void
  public isThumbnailEnabled: boolean = false

  get hasViewer() {
    return !!this.viewer
  }

  setViewer(viewer?: Viewer) {
    this.viewer = viewer
  }

  setThumbnailViewer(thumbnailViewer?: ThumbnailViewer) {
    this.thumbnailViewer = thumbnailViewer
  }

  isHighestPriority(page: Page) {
    return this.highestPriorityPage === page.renderingId
  }

  renderHighestPriority(currentlyVisiblePages?: VisibleElements) {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout)
      this.idleTimeout = undefined
    }

    if (this.viewer?.forceRendering(currentlyVisiblePages)) {
      return
    }

    if (this.isThumbnailEnabled && this.thumbnailViewer?.forceRendering()) {
      return
    }

    if (this.printing) {
      return
    }

    if (this.onIdle) {
      this.idleTimeout = setTimeout(this.onIdle.bind(this), 30000)
    }
  }

  getHighestPriority(
    visible: VisibleElements,
    pages: Page[],
    scrolledDown: boolean,
    preRenderExtra: boolean = false,
  ) {
    if (!visible.pages.length) {
      return null
    }

    for (let i = 0; i < visible.pages.length; i++) {
      const page = visible.pages[i].page

      if (!this.isPageFinished(page)) {
        return page
      }
    }

    const firstId = visible.first!.id
    const lastId = visible.last!.id

    if (lastId - firstId + 1 > visible.pages.length) {
      const visibleIds = visible.ids

      for (let i = 1, ii = lastId - firstId; i < ii; i++) {
        const holeId = scrolledDown ? firstId + i : lastId - i
        if (visibleIds.has(holeId)) {
          continue
        }

        const holeView = pages[holeId - 1]
        if (!this.isPageFinished(holeView)) {
          return holeView
        }
      }
    }

    let preRenderIndex = scrolledDown ? lastId : firstId - 2
    let preRenderView = pages[preRenderIndex]

    if (preRenderView && !this.isPageFinished(preRenderView)) {
      return preRenderView
    }

    if (preRenderExtra) {
      preRenderIndex += scrolledDown ? 1 : -1
      preRenderView = pages[preRenderIndex]

      if (preRenderView && !this.isPageFinished(preRenderView)) {
        return preRenderView
      }
    }

    return null
  }

  isPageFinished(page: Page) {
    return page.renderingState === RenderingStates.FINISHED
  }

  renderPage(page: Page) {
    switch (page.renderingState) {
      case RenderingStates.FINISHED:
        return false

      case RenderingStates.PAUSED:
        this.highestPriorityPage = page.renderingId
        page.resume?.()
        break

      case RenderingStates.RUNNING:
        this.highestPriorityPage = page.renderingId
        break

      case RenderingStates.INITIAL:
        this.highestPriorityPage = page.renderingId

        page.draw()
          .finally(() => this.renderHighestPriority())
          .catch((reason) => {
            if (reason instanceof RenderingCancelledException) {
              return
            }
            console.error(`renderPage: '${reason}'`)
          })
        break
    }

    return true
  }
}
