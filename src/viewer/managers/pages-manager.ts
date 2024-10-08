import { ScrollMode, SpreadMode } from '@/enums'
import { isPortraitOrientation, VisibleElements } from '@/utils'
import type { Page, PageUpdate } from '../page'
import { Manager } from './'

export class PagesManager extends Manager {
  private _pages: Page[] = []
  private _currentPageNumber = 1

  reset() {
    this._pages = []
    this._currentPageNumber = 1
  }

  refresh(params: PageUpdate) {
    for (const page of this.pages) {
      page.update(params)
    }
  }

  update(visible: VisibleElements) {
    const isSimpleLayout = this.spreadMode === SpreadMode.NONE
      && (this.scrollMode === ScrollMode.PAGE || this.scrollMode === ScrollMode.VERTICAL)

    const currentId = this.currentPageNumber
    let stillFullyVisible = false

    for (const view of visible.views) {
      if (view.percent < 100) {
        break
      }

      if (view.id === currentId && isSimpleLayout) {
        stillFullyVisible = true
        break
      }
    }

    this.setCurrentPageNumber(stillFullyVisible ? currentId : visible.views[0].id)
  }

  get pages() {
    return this._pages
  }

  get pagesReady() {
    return this.pages.every(page => page?.pdfPage)
  }

  get pagesCount() {
    return this.pages.length
  }

  getPage(index: number) {
    return this.pages[index]
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
      console.error(`currentPageNumber: '${val}' is not a valid page.`)
    }
  }

  setCurrentPageNumber(val: number, resetCurrentPage = false) {
    if (this.currentPageNumber === val) {
      if (resetCurrentPage) {
        this.resetCurrentPage()
      }

      return true
    }

    if (!(0 < val && val <= this.pagesCount)) {
      return false
    }

    const previous = this.currentPageNumber

    this._currentPageNumber = val
    this.dispatch('pagechanging', {
      pageNumber: val,
      pageLabel: this.pageLabelsManager.pageLabels?.[val - 1] ?? null,
      previous,
    })

    if (resetCurrentPage) {
      this.resetCurrentPage()
    }

    return true
  }

  resetCurrentPage() {
    const page = this.pages[this.currentPageNumber - 1]

    if (this.isInPresentationMode && this.currentScaleValue) {
      this.scaleManager.setScale(this.currentScaleValue, { noScroll: true })
    }

    this.scrollManager.scrollIntoView(page)
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

  hasNextPage() {
    return this.currentPageNumber < this.pagesCount
  }

  hasPreviousPage() {
    return this.currentPageNumber > 1
  }

  nextPage() {
    if (!this.hasNextPage()) return false

    const advance = this.getPageAdvance(this.currentPageNumber, false) || 1
    this.currentPageNumber = Math.min(this.currentPageNumber + advance, this.pagesCount)

    return true
  }

  previousPage() {
    if (!this.hasPreviousPage()) return false

    const advance = this.getPageAdvance(this.currentPageNumber, true) || 1
    this.currentPageNumber = Math.max(this.currentPageNumber - advance, 1)

    return true
  }

  firstPage() {
    this.currentPageNumber = 1
  }

  lastPage() {
    this.currentPageNumber = this.pagesCount
  }

  getPagesOverview() {
    let initialOrientation: boolean | undefined = undefined

    return this.pages.map((page) => {
      const viewport = page.pdfPage!.getViewport({ scale: 1 })
      const orientation = isPortraitOrientation(viewport)

      if (initialOrientation === undefined) {
        initialOrientation = orientation
      } else if (this.options.enablePrintAutoRotate && orientation !== initialOrientation) {
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

  private getPageAdvance(currentPageNumber: number, previous = false) {
    switch (this.scrollMode) {
      case ScrollMode.WRAPPED:
      {
        const visible = this.scrollManager.getVisiblePages()
        const pageLayout = new Map()

        for (const view of visible.views) {
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
          } else {
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
          } else {
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
        if (this.spreadMode === SpreadMode.NONE) {
          break
        }

        const parity = this.spreadMode - 1

        if (previous && currentPageNumber % 2 !== parity) {
          break
        } else if (!previous && currentPageNumber % 2 === parity) {
          break
        }

        const visible = this.scrollManager.getVisiblePages()
        const expectedId = previous ? currentPageNumber - 1 : currentPageNumber + 1

        for (const view of visible.views) {
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
}
