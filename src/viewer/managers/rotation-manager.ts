import { Manager } from './manager'

export function isValidRotation(angle: number) {
  return Number.isInteger(angle) && angle % 90 === 0
}

export class RotationManager extends Manager {
  private _pagesRotation = 0

  reset() {
    this._pagesRotation = 0
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

    if (this.pagesRotation === rotation) {
      return
    }

    this._pagesRotation = rotation
    const pageNumber = this.currentPageNumber

    this.viewer.refresh(true, { rotation })

    if (this.currentScaleValue) {
      this.scaleManager.setScale(this.currentScaleValue, { noScroll: true })
    }

    this.dispatch('rotationchanging', {
      pagesRotation: rotation,
      pageNumber,
    })

    this.viewer.update()
  }
}
