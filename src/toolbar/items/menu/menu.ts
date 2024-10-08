import { ToolbarMenu } from '@/toolbar'
import * as all from '@/toolbar/items'

export class Menu extends ToolbarMenu {
  constructor() {
    super([
      [
        new all.PresentationMode(),
        new all.ProgressTracker(),
      ],
      [
        new all.FirstPage(),
        new all.LastPage(),
      ],
      [
        new all.CursorSelect(),
        new all.CursorHand(),
      ],
      [
        new all.SpreadNone(),
        new all.SpreadEven(),
        new all.SpreadOdd(),
      ],
      [
        new all.RotateCw(),
        new all.RotateCcw(),
      ],
      [
        new all.ScrollPage(),
        new all.ScrollVertical(),
        new all.ScrollHorizontal(),
        new all.ScrollWrapped(),
      ],
    ])
  }
}
