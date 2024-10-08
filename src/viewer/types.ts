import type { EventBus } from '@/bus'
import type { TextLayerMode } from '@/enums'
import type { Viewer } from '../viewer'
import * as managers from './managers'

export type ViewerOptions = {
  eventBus?: EventBus
  container?: HTMLDivElement
  abortSignal?: AbortSignal
  textLayerMode?: TextLayerMode
  enablePermissions?: boolean
  removePageBorders?: boolean
  supportsPinchToZoom?: boolean
  imageResourcesPath?: string
  maxCanvasPixels?: number
  annotationMode?: number
  annotationEditorMode?: number
  annotationEditorHighlightColors?: string
  enablePrintAutoRotate?: boolean
  enableHWA?: boolean
}

export type ViewerType = Viewer &
  managers.AnnotationManager &
  managers.ContainerManager &
  managers.DocumentManager &
  managers.LayerBuildersManager &
  managers.LayerPropertiesManager &
  managers.LocationManager &
  managers.OptionalContentManager &
  managers.PageLabelsManager &
  managers.PagesManager &
  managers.PresentationManager &
  managers.RenderManager &
  managers.RotationManager &
  managers.ScaleManager &
  managers.ScrollManager &
  managers.SpreadManager
