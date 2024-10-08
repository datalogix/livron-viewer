import { VisibleElement, VisibleElements } from '@/utils'
import { Manager } from './'

export type Location = {
  pageNumber: number
  scale?: string | number
  top: number
  left: number
  rotation: number
  pdfOpenParams: string
}

export class LocationManager extends Manager {
  private _location?: Location

  get location() {
    return this._location
  }

  reset() {
    this._location = undefined
  }

  update(visible: VisibleElements) {
    this.updateLocation(visible.first!)
  }

  updateLocation(firstPage: VisibleElement) {
    const currentScale = this.currentScale
    const currentScaleValue = this.currentScaleValue
    const normalizedScaleValue = parseFloat(String(currentScaleValue)) === currentScale
      ? Math.round(currentScale * 10000) / 100
      : currentScaleValue
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

    this._location = {
      pageNumber,
      scale: normalizedScaleValue,
      top: intTop,
      left: intLeft,
      rotation: this.rotationManager.pagesRotation,
      pdfOpenParams,
    }

    this.dispatch('updateviewarea', { location: this.location })
  }
}
