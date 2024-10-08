import { Plugin } from '../plugin'
import { BookmarkLayerBuilder } from './bookmark-layer-builder'

export class BookmarkPlugin extends Plugin {
  protected init() {
    this.viewer.addLayerBuilder(BookmarkLayerBuilder)
  }

  protected destroy() {
    this.viewer.removeLayerBuilder(BookmarkLayerBuilder)
  }
}
