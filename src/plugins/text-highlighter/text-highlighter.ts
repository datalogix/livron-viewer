import type { EventBus } from '@/bus'
import { createElement } from '@/utils'
import type { FindPlugin } from '../find'

type MatchItem = {
  divIndex: number
  offset: number
}

type Matches = {
  begin: MatchItem
  end: MatchItem
}[]

export class TextHighlighter {
  private enabled = false
  private abortController?: AbortController
  private textDivs: HTMLElement[] = []
  private textContentItemsStr: string[] = []
  private matches: Matches = []

  constructor(
    private readonly pageIndex: number,
    private readonly eventBus?: EventBus,
    private readonly findPlugin?: FindPlugin,
  ) { }

  setTextMapping(divs: HTMLElement[], texts: string[]) {
    this.textDivs = divs
    this.textContentItemsStr = texts
  }

  enable() {
    if (!this.textDivs || !this.textContentItemsStr) {
      throw new Error('Text divs and strings have not been set.')
    }

    if (this.enabled) {
      throw new Error('TextHighlighter is already enabled.')
    }

    this.enabled = true

    if (!this.abortController) {
      this.abortController = new AbortController()
      this.eventBus?.on('updatetextlayermatches', ({ pageIndex }: { pageIndex: number }) => {
        if (pageIndex === this.pageIndex || pageIndex === -1) {
          this.updateMatches()
        }
      }, { signal: this.abortController.signal })
    }

    this.updateMatches()
  }

  disable() {
    if (!this.enabled) return

    this.enabled = false
    this.abortController?.abort()
    this.abortController = undefined
    this.updateMatches(true)
  }

  private updateMatches(reset = false) {
    if (!this.enabled && !reset) {
      return
    }

    let clearedUntilDivIndex = -1

    for (const match of this.matches) {
      const begin = Math.max(clearedUntilDivIndex, match.begin.divIndex)

      for (let n = begin, end = match.end.divIndex; n <= end; n++) {
        const div = this.textDivs[n]
        div.textContent = this.textContentItemsStr[n]
        div.className = ''
      }

      clearedUntilDivIndex = match.end.divIndex + 1
    }

    if (!this.findPlugin?.highlightMatches || reset) {
      return
    }

    this.matches = convertMatches(
      this.textContentItemsStr,
      this.findPlugin.pageMatches[this.pageIndex] || null,
      this.findPlugin.pageMatchesLength[this.pageIndex] || null,
    )

    renderMatches(
      this.matches,
      this.findPlugin,
      this.pageIndex,
      this.textDivs,
      this.textContentItemsStr,
    )
  }
}

const renderMatches = (
  matches: Matches,
  findPlugin: FindPlugin,
  pageIndex: number,
  textDivs: HTMLElement[],
  textContentItemsStr: string[],
) => {
  if (matches.length === 0) {
    return
  }

  const isSelectedPage = pageIndex === findPlugin.selected.pageIndex
  const selectedMatchIndex = findPlugin.selected.matchIndex
  const highlightAll = findPlugin.state?.highlightAll

  let prevEnd: MatchItem | null = null

  const infinity = {
    divIndex: -1,
    offset: undefined,
  }

  const beginText = (begin: MatchItem, className?: string) => {
    const divIndex = begin.divIndex
    textDivs[divIndex].textContent = ''
    return appendTextToDiv(divIndex, 0, begin.offset, className)
  }

  const appendTextToDiv = (divIndex: number, fromOffset: number, toOffset?: number, className?: string) => {
    let div = textDivs[divIndex]

    if (div.nodeType === Node.TEXT_NODE) {
      const span = createElement('span')
      div.before(span)
      span.append(div)
      textDivs[divIndex] = span
      div = span
    }

    const content = textContentItemsStr[divIndex].substring(fromOffset, toOffset)
    const node = document.createTextNode(content)

    if (className) {
      const span = createElement('span')
      span.className = `${className} appended'`
      span.append(node)
      div.append(span)
      return className.includes('selected') ? span.offsetLeft : 0
    }

    div.append(node)

    return 0
  }

  let i0 = selectedMatchIndex
  let i1 = i0 + 1

  if (highlightAll) {
    i0 = 0
    i1 = matches.length
  } else if (!isSelectedPage) {
    return
  }

  let lastDivIndex = -1
  let lastOffset = -1

  for (let i = i0; i < i1; i++) {
    const match = matches[i]
    const begin = match.begin

    if (begin.divIndex === lastDivIndex && begin.offset === lastOffset) {
      continue
    }

    lastDivIndex = begin.divIndex
    lastOffset = begin.offset

    const end = match.end
    const isSelected = isSelectedPage && i === selectedMatchIndex
    const highlightSuffix = isSelected ? ' selected' : ''

    let selectedLeft = 0
    if (!prevEnd || begin.divIndex !== prevEnd.divIndex) {
      if (prevEnd !== null) {
        appendTextToDiv(prevEnd.divIndex, prevEnd.offset, infinity.offset)
      }

      beginText(begin)
    } else {
      appendTextToDiv(prevEnd.divIndex, prevEnd.offset, begin.offset)
    }

    if (begin.divIndex === end.divIndex) {
      selectedLeft = appendTextToDiv(begin.divIndex, begin.offset, end.offset, 'highlight' + highlightSuffix)
    } else {
      selectedLeft = appendTextToDiv(begin.divIndex, begin.offset, infinity.offset, 'highlight begin' + highlightSuffix)

      for (let n0 = begin.divIndex + 1, n1 = end.divIndex; n0 < n1; n0++) {
        textDivs[n0].className = 'highlight middle' + highlightSuffix
      }

      beginText(end, 'highlight end' + highlightSuffix)
    }

    prevEnd = end

    if (isSelected) {
      findPlugin.scrollMatchIntoView({
        element: textDivs[begin.divIndex],
        selectedLeft,
        pageIndex,
        matchIndex: selectedMatchIndex,
      })
    }
  }

  if (prevEnd) {
    appendTextToDiv(prevEnd.divIndex, prevEnd.offset, infinity.offset)
  }
}

const convertMatches = (
  items: string[],
  matches: (number[] | null),
  matchesLength?: (number[] | null),
): Matches => {
  if (!matches || !matchesLength) return []

  let i = 0
  let iIndex = 0

  const end = items.length - 1
  const result: {
    begin: {
      divIndex: number
      offset: number
    }
    end: {
      divIndex: number
      offset: number
    }
  }[] = []

  for (let m = 0, mm = matches.length; m < mm; m++) {
    let matchIndex = matches[m]

    while (i !== end && matchIndex >= iIndex + items[i].length) {
      iIndex += items[i].length
      i++
    }

    if (i === items.length) {
      console.error('Could not find a matching mapping')
    }

    const begin = {
      divIndex: i,
      offset: matchIndex - iIndex,
    }

    matchIndex += matchesLength[m]

    while (i !== end && matchIndex > iIndex + items[i].length) {
      iIndex += items[i].length
      i++
    }

    result.push({
      begin,
      end: {
        divIndex: i,
        offset: matchIndex - iIndex,
      },
    })
  }

  return result
}
