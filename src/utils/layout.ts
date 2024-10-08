import { ScrollMode, SpreadMode } from '@/enums'

export function apiPageLayoutToViewerModes(layout: string) {
  let scrollMode = ScrollMode.VERTICAL
  let spreadMode = SpreadMode.NONE

  switch (layout) {
    case 'SinglePage':
      scrollMode = ScrollMode.PAGE
      break

    case 'OneColumn':
      break

    case 'TwoPageLeft':
      scrollMode = ScrollMode.PAGE
      spreadMode = SpreadMode.ODD
      break

    case 'TwoColumnLeft':
      spreadMode = SpreadMode.ODD
      break

    case 'TwoPageRight':
      scrollMode = ScrollMode.PAGE
      spreadMode = SpreadMode.EVEN
      break

    case 'TwoColumnRight':
      spreadMode = SpreadMode.EVEN
      break
  }

  return { scrollMode, spreadMode }
}
