import { Dispatcher, EventBus } from '@/bus'
import type { PluginType } from '@/plugins'
import { Toolbar, ToolbarOptions, type ToolbarItemType } from '@/toolbar'
import { Viewer, type ViewerType, type ViewerOptions } from '@/viewer'
import { DEFAULT_PLUGINS, DEFAULT_TOOLBAR_ITEMS, DEFAULT_OPTIONS } from './defaults'

export type LivronOptions = {
  container: string | HTMLDivElement
  toolbarOptions?: ToolbarOptions
  viewerOptions?: ViewerOptions
}

export class Livron extends Dispatcher {
  protected plugins: PluginType[] = DEFAULT_PLUGINS
  protected toolbarItems: Map<string, ToolbarItemType> = DEFAULT_TOOLBAR_ITEMS

  constructor(readonly eventBus: EventBus = new EventBus()) {
    super()
  }

  addPlugin(plugin: PluginType) {
    this.plugins.push(plugin)
  }

  removePlugin(pluginToRemove: PluginType | string) {
    this.plugins = this.plugins.filter((plugin) => {
      if (typeof pluginToRemove === 'string') {
        const pluginClassName = typeof plugin === 'function' ? plugin.name : plugin.constructor.name
        return pluginClassName !== pluginToRemove
      }

      if (typeof pluginToRemove === 'function') {
        return !(typeof plugin === 'function' && plugin === pluginToRemove) && !(plugin instanceof pluginToRemove)
      }

      return plugin !== pluginToRemove
    })
  }

  protected resolvePlugins() {
    return this.plugins.map(plugin => typeof plugin === 'function' ? new plugin() : plugin)
  }

  protected async initializePlugins(toolbar: Toolbar, viewer: ViewerType) {
    const plugins = this.resolvePlugins()

    for (const plugin of plugins) {
      plugin.setToolbar(toolbar)
      plugin.setViewer(viewer)

      await plugin.initialize()
    }

    return plugins
  }

  registerToolbarItem(name: string, item: ToolbarItemType) {
    this.toolbarItems.set(name, item)
  }

  unregisterToolbarItem(name: string) {
    this.toolbarItems.delete(name)
  }

  protected async initializeToolbar(toolbar: Toolbar) {
    this.toolbarItems.forEach((item, name) => toolbar.register(name, item))

    await toolbar.initialize()
  }

  async render(options: LivronOptions = DEFAULT_OPTIONS) {
    const container = options.container instanceof HTMLDivElement
      ? options.container
      : document.getElementById(options.container) as HTMLDivElement

    if (!container) {
      throw new Error(`Container element "${options.container}" not found.`)
    }

    container.tabIndex = 0

    const viewer = new Viewer({
      eventBus: this.eventBus,
      ...options.viewerOptions,
    }) as ViewerType

    const toolbar = new Toolbar(viewer, options.toolbarOptions)

    container.appendChild(toolbar.render())
    container.appendChild(viewer.render())
    container.dir = viewer.l10n.getDirection()

    await this.initializePlugins(toolbar, viewer)
    await this.initializeToolbar(toolbar)

    return viewer
  }
}
