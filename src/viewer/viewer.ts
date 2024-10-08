import { EventBus } from '@/bus'
import { expose } from '@/utils'
import * as managers from './managers'
import type { PageUpdate, ViewerOptions } from './'

export class Viewer {
  readonly eventBus: EventBus
  readonly annotationManager: managers.AnnotationManager
  readonly containerManager: managers.ContainerManager
  readonly documentManager: managers.DocumentManager
  readonly layerBuildersManager: managers.LayerBuildersManager
  readonly layerPropertiesManager: managers.LayerPropertiesManager
  readonly locationManager: managers.LocationManager
  readonly optionalContentManager: managers.OptionalContentManager
  readonly pageLabelsManager: managers.PageLabelsManager
  readonly pagesManager: managers.PagesManager
  readonly presentationManager: managers.PresentationManager
  readonly renderManager: managers.RenderManager
  readonly rotationManager: managers.RotationManager
  readonly scaleManager: managers.ScaleManager
  readonly scrollManager: managers.ScrollManager
  readonly spreadManager: managers.SpreadManager
  protected managers: Set<managers.Manager>

  constructor(readonly options: ViewerOptions = {}) {
    this.eventBus = options.eventBus ?? new EventBus()
    this.managers = new Set([
      this.annotationManager = new managers.AnnotationManager(this),
      this.containerManager = new managers.ContainerManager(this),
      this.optionalContentManager = new managers.OptionalContentManager(this),
      this.pagesManager = new managers.PagesManager(this),
      this.layerBuildersManager = new managers.LayerBuildersManager(this),
      this.layerPropertiesManager = new managers.LayerPropertiesManager(this),
      this.documentManager = new managers.DocumentManager(this),
      this.scrollManager = new managers.ScrollManager(this),
      this.scaleManager = new managers.ScaleManager(this),
      this.spreadManager = new managers.SpreadManager(this),
      this.presentationManager = new managers.PresentationManager(this),
      this.renderManager = new managers.RenderManager(this),
      this.rotationManager = new managers.RotationManager(this),
      this.locationManager = new managers.LocationManager(this),
      this.pageLabelsManager = new managers.PageLabelsManager(this),
    ])

    this.managers.forEach((manager) => {
      this.expose(manager)

      manager.init()
      manager.reset()
    })
  }

  get container() {
    return this.containerManager.getContainer()
  }

  render() {
    return this.container
  }

  reset() {
    this.managers.forEach(manager => manager.reset())
  }

  update() {
    const visible = this.scrollManager.getVisiblePages()

    if (visible.views.length === 0) {
      return
    }

    this.managers.forEach(manager => manager.update(visible))
  }

  refresh(noUpdate = false, params: PageUpdate = {}) {
    this.managers.forEach(manager => manager.refresh(params))

    if (noUpdate) {
      return
    }

    this.update()
  }

  private expose(manager: managers.Manager) {
    expose(this, manager)
  }
}
