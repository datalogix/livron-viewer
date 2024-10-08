import { Manager } from './'

export class PageLabelsManager extends Manager {
  private _pageLabels?: string[]

  reset() {
    this._pageLabels = undefined
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
      console.error('setPageLabels: Invalid page labels.')
    } else {
      this._pageLabels = labels
    }

    for (let i = 0, ii = this.pages.length; i < ii; i++) {
      this.pages[i].setPageLabel(this.pageLabels?.[i])
    }
  }

  get currentPageLabel() {
    return this.pageLabels?.[this.currentPageNumber - 1] ?? null
  }

  set currentPageLabel(val: string | null) {
    if (!this.pdfDocument) {
      return
    }

    let page = 0

    if (this.pageLabels) {
      const i = this.pageLabels.indexOf(val ?? '0')
      if (i >= 0) {
        page = i + 1
      }
    }

    if (!this.pagesManager.setCurrentPageNumber(page, true)) {
      console.error(`currentPageLabel: '${val}' is not a valid page.`)
    }
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
}
