import type { EventBus } from '@/bus'
import type { TextLayerMode } from '@/enums'
import * as pdfjs from '@/pdfjs'
import type { LayerBuilderType } from '../layers'
import * as managers from '../managers'
import type { RenderingQueue } from '../rendering'

export type PageOptions = {
  id: number
  viewport: pdfjs.PageViewport
  eventBus: EventBus
  container?: HTMLElement
  scale: number
  rotation: number
  optionalContentConfigPromise?: Promise<pdfjs.OptionalContentConfig>
  renderingQueue?: RenderingQueue
  maxCanvasPixels?: number
  textLayerMode?: TextLayerMode
  imageResourcesPath?: string
  annotationMode?: number
  layerBuilders?: LayerBuilderType[]
  layerProperties: managers.LayerPropertiesManager
  enableHWA?: boolean
}

export type PageUpdate = {
  scale?: number
  rotation?: number
  optionalContentConfigPromise?: Promise<pdfjs.OptionalContentConfig>
  drawingDelay?: number
}
