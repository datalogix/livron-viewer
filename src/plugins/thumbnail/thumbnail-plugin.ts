import { Plugin } from '../plugin'
import { ThumbnailLayerBuilder } from './thumbnail-layer-builder'

export class ThumbnailPlugin extends Plugin {
  protected init() {
    this.viewer.addLayerBuilder(ThumbnailLayerBuilder)

    this.on('thumbnailclick', (pageNumber) => {
      this.page = pageNumber
    })
  }

  protected destroy() {
    this.viewer.removeLayerBuilder(ThumbnailLayerBuilder)
  }
}
