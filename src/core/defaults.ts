import * as plugins from '@/plugins'
import * as toolbar from '@/toolbar'

export const DEFAULT_PLUGINS: plugins.PluginType[] = [
  plugins.ZoomPlugin,
  plugins.ResizePlugin,
  plugins.ResolutionPlugin,
  plugins.PresentationPlugin,
  plugins.CursorPlugin,
  plugins.PlayerPlugin,
  plugins.BookmarkPlugin,
  plugins.InteractionPlugin,
  plugins.CopyPlugin,
  plugins.FindPlugin,
  plugins.TextHighlighterPlugin,
  plugins.ThumbnailPlugin,
  plugins.TextAccessibilityPlugin,
  plugins.LibraryPlugin,
]

export const DEFAULT_TOOLBAR = [
  'sidebar find paginate',
  'zoom-out zoom-in zoom-select',
  'library menu',
]

export const DEFAULT_TOOLBAR_ITEMS = new Map<string, toolbar.ToolbarItemType>([
  ['first-page', toolbar.FirstPage],
  ['last-page', toolbar.LastPage],
  ['prev-page', toolbar.PrevPage],
  ['next-page', toolbar.NextPage],
  ['input-page', toolbar.InputPage],
  ['paginate', toolbar.Paginate],
  ['cursor-hand', toolbar.CursorHand],
  ['cursor-select', toolbar.CursorSelect],
  ['zoom-out', toolbar.ZoomOut],
  ['zoom-in', toolbar.ZoomIn],
  ['zoom-select', toolbar.ZoomSelect],
  ['spread-even', toolbar.SpreadEven],
  ['spread-odd', toolbar.SpreadOdd],
  ['spread-none', toolbar.SpreadNone],
  ['spread-group', toolbar.SpreadGroup],
  ['rotate-cw', toolbar.RotateCw],
  ['rotate-ccw', toolbar.RotateCcw],
  ['scroll-page', toolbar.ScrollPage],
  ['scroll-vertical', toolbar.ScrollVertical],
  ['scroll-horizontal', toolbar.ScrollHorizontal],
  ['scroll-wrapped', toolbar.ScrollWrapped],
  ['scroll-group', toolbar.ScrollGroup],
  ['presentation-mode', toolbar.PresentationMode],
  ['menu', toolbar.Menu],
  ['progress-tracker', toolbar.ProgressTracker],
  ['sidebar', new toolbar.Sidebar(new Map<string, toolbar.SidebarItem>([
    ['thumbnail', new plugins.ThumbnailSidebar()],
    ['interaction', new plugins.InteractionSidebar()],
    ['bookmark', new plugins.BookmarkSidebar()],
  ]))],
])

export const DEFAULT_OPTIONS = {
  container: 'app',
  toolbarOptions: {
    toolbar: DEFAULT_TOOLBAR,
  },
}
