import { Dispatcher } from '@/bus'
import type { ViewerType } from '@/viewer'
import type { Toolbar, ToolbarItemType } from '@/toolbar'

export type PluginType = (Plugin | (new () => Plugin))

export abstract class Plugin extends Dispatcher {
  private _toolbar?: Toolbar
  private _viewer?: ViewerType
  protected abortController?: AbortController

  get name() {
    return this.constructor.name.toLowerCase()
  }

  get toolbar() {
    return this._toolbar!
  }

  get viewer() {
    return this._viewer!
  }

  get options() {
    return this.viewer.options
  }

  get eventBus() {
    return this.viewer.eventBus
  }

  get signal() {
    return this.abortController?.signal
  }

  get pdfDocument() {
    return this.viewer.getDocument()
  }

  get container() {
    return this.viewer.getContainer()
  }

  get viewerContainer() {
    return this.viewer.getViewerContainer()
  }

  get pagesCount() {
    return this.viewer.pagesManager.pagesCount
  }

  get page() {
    return this.viewer.pagesManager.currentPageNumber
  }

  set page(val: number) {
    this.viewer.pagesManager.currentPageNumber = val
  }

  setToolbar(toolbar: Toolbar) {
    this._toolbar = toolbar
  }

  setViewer(viewer: ViewerType) {
    this._viewer = viewer
  }

  protected getToolbarItems(): Map<string, ToolbarItemType> {
    return new Map()
  }

  protected init(): Promise<void> | void {

  }

  async initialize() {
    for (const [name, item] of this.getToolbarItems()) {
      this.toolbar.register(name, item)
    }

    this.abortController = new AbortController()
    this.viewer.addLayerProperty(this.name, this)

    await this.init()

    this.dispatch(`plugin${this.name}init`)
  }

  protected destroy(): Promise<void> | void {

  }

  async terminate() {
    this.viewer.removeLayerProperty(this.name)
    this.abortController?.abort()
    this.abortController = undefined

    await this.destroy()

    this.dispatch(`plugin${this.name}destroy`)
  }
}
