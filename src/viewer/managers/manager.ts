import { Dispatcher } from '@/bus'
import { VisibleElements } from '@/utils'
import type { PageUpdate, Viewer } from '../'

export abstract class Manager extends Dispatcher {
  constructor(protected readonly viewer: Viewer) {
    super()
  }

  init() {
    //
  }

  reset() {
    //
  }

  refresh(_params: PageUpdate) {
    //
  }

  update(_visible: VisibleElements) {
    //
  }

  get options() {
    return this.viewer.options
  }

  get eventBus() {
    return this.viewer.eventBus
  }

  get signal() {
    return this.options.abortSignal
  }

  get annotationManager() {
    return this.viewer.annotationManager
  }

  get containerManager() {
    return this.viewer.containerManager
  }

  get documentManager() {
    return this.viewer.documentManager
  }

  get layerBuildersManager() {
    return this.viewer.layerBuildersManager
  }

  get locationManager() {
    return this.viewer.locationManager
  }

  get optionalContentManager() {
    return this.viewer.optionalContentManager
  }

  get pageLabelsManager() {
    return this.viewer.pageLabelsManager
  }

  get pagesManager() {
    return this.viewer.pagesManager
  }

  get presentationManager() {
    return this.viewer.presentationManager
  }

  get renderManager() {
    return this.viewer.renderManager
  }

  get rotationManager() {
    return this.viewer.rotationManager
  }

  get scaleManager() {
    return this.viewer.scaleManager
  }

  get scrollManager() {
    return this.viewer.scrollManager
  }

  get spreadManager() {
    return this.viewer.spreadManager
  }

  get pdfDocument() {
    return this.documentManager.getDocument()
  }

  get container() {
    return this.containerManager.getContainer()
  }

  get viewerContainer() {
    return this.containerManager.getViewerContainer()
  }

  get pagesCount() {
    return this.pagesManager.pagesCount
  }

  get pages() {
    return this.pagesManager.pages
  }

  get currentPageNumber() {
    return this.pagesManager.currentPageNumber
  }

  get currentScale() {
    return this.scaleManager.currentScale
  }

  get currentScaleValue() {
    return this.scaleManager.currentScaleValue
  }

  get scrollMode() {
    return this.scrollManager.scrollMode
  }

  get spreadMode() {
    return this.spreadManager.spreadMode
  }

  get pagesRotation() {
    return this.rotationManager.pagesRotation
  }

  get renderingQueue() {
    return this.renderManager.renderingQueue
  }

  get isInPresentationMode() {
    return this.presentationManager.isInPresentationMode
  }

  get isChangingPresentationMode() {
    return this.presentationManager.isChangingPresentationMode
  }

  get location() {
    return this.locationManager.location
  }
}
