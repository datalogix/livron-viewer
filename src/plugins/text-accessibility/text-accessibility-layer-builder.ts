import { LayerBuilder } from '@/viewer'
import { TextAccessibilityManager } from './text-accessibility-manager'

export class TextAccessibilityLayerBuilder extends LayerBuilder {
  readonly textAccessibilityManager = new TextAccessibilityManager()
}
