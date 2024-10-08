import * as layers from '../layers'
import { Manager } from './'

export class LayerBuildersManager extends Manager {
  private builders = new Set<layers.LayerBuilderType>([
    layers.AnnotationLayerBuilder,
    layers.AnnotationEditorLayerBuilder,
    layers.DrawLayerBuilder,
    layers.XfaLayerBuilder,
    layers.TextLayerBuilder,
    layers.StructTreeLayerBuilder,
    layers.ZoomLayerBuilder,
  ])

  addLayerBuilder(layerBuilder: layers.LayerBuilderType) {
    this.builders.add(layerBuilder)
  }

  removeLayerBuilder(layerBuilder: layers.LayerBuilderType) {
    this.builders.delete(layerBuilder)
  }

  layersToArray() {
    return Array.from(this.builders)
  }
}
