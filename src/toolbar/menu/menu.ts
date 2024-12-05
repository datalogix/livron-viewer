import * as plugins from '@/plugins'
import * as toolbar from '@/toolbar'

export class Menu extends toolbar.ToolbarMenu {
  constructor(actions = [
    [
      new toolbar.Information(),
      new plugins.LibraryToolbarItem(),
    ],
    [
      new toolbar.Open(),
      new plugins.DownloadToolbarItem(),
      new plugins.PrintToolbarItem(),
      new plugins.PresentationToolbarItem(),
    ],
    [
      new toolbar.CurrentPage(),
      new toolbar.FirstPage(),
      new toolbar.LastPage(),
    ],
    [
      new plugins.CursorSelect(),
      new plugins.CursorHand(),
    ],
    [
      new toolbar.SpreadNone(),
      new toolbar.SpreadEven(),
      new toolbar.SpreadOdd(),
    ],
    [
      new toolbar.RotateCw(),
      new toolbar.RotateCcw(),
    ],
    [
      new toolbar.ScrollPage(),
      new toolbar.ScrollVertical(),
      new toolbar.ScrollHorizontal(),
      new toolbar.ScrollWrapped(),
    ],
  ]) {
    super(actions)
  }
}
