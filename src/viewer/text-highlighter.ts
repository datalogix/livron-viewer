import type { FindController } from './types'

type MatchItem = {
  divIdx: number
  offset: number
}

type Matches = {
  begin: MatchItem
  end: MatchItem
}[]

export class TextHighlighter {
  private enabled: boolean = false
  private eventAbortController?: AbortController
  private textDivs: HTMLElement[] = []
  private textContentItemsStr: string[] = []
  private matches: Matches = []

  constructor(
    private readonly findController: FindController,
    private readonly eventBus: any,
    private readonly pageIndex: number,
  ) {}

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

    if (!this.eventAbortController) {
      this.eventAbortController = new AbortController()
      this.eventBus.on('updatetextlayermatches', ({ pageIndex }: { pageIndex: number }) => {
        if (pageIndex === this.pageIndex || pageIndex === -1) {
          this.updateMatches()
        }
      }, { signal: this.eventAbortController.signal })
    }

    this.updateMatches()
  }

  disable() {
    if (!this.enabled) return

    this.enabled = false
    this.eventAbortController?.abort()
    this.eventAbortController = undefined
    this.updateMatches(true)
  }

  private updateMatches(reset: boolean = false) {
    if (!this.enabled && !reset) {
      return
    }

    let clearedUntilDivIdx = -1

    for (const match of this.matches) {
      const begin = Math.max(clearedUntilDivIdx, match.begin.divIdx)

      for (let n = begin, end = match.end.divIdx; n <= end; n++) {
        const div = this.textDivs[n]
        div.textContent = this.textContentItemsStr[n]
        div.className = ''
      }

      clearedUntilDivIdx = match.end.divIdx + 1
    }

    if (!this.findController?.highlightMatches || reset) {
      return
    }

    this.matches = convertMatches(
      this.textContentItemsStr,
      this.findController.pageMatches[this.pageIndex] || null,
      this.findController.pageMatchesLength[this.pageIndex] || null,
    )

    renderMatches(
      this.matches,
      this.findController,
      this.pageIndex,
      this.textDivs,
      this.textContentItemsStr,
    )
  }
}

const renderMatches = (
  matches: Matches,
  findController: FindController,
  pageIndex: number,
  textDivs: HTMLElement[],
  textContentItemsStr: string[],
) => {
  if (matches.length === 0) {
    return
  }

  const isSelectedPage = pageIndex === findController.selected.pageIndex
  const selectedMatchIndex = findController.selected.matchIndex
  const highlightAll = findController.state?.highlightAll

  let prevEnd: MatchItem | null = null

  const infinity = {
    divIdx: -1,
    offset: undefined,
  }

  function beginText(begin: MatchItem, className?: string) {
    const divIdx = begin.divIdx
    textDivs[divIdx].textContent = ''
    return appendTextToDiv(divIdx, 0, begin.offset, className)
  }

  function appendTextToDiv(divIdx: number, fromOffset: number, toOffset?: number, className?: string) {
    let div = textDivs[divIdx]

    if (div.nodeType === Node.TEXT_NODE) {
      const span = document.createElement('span')
      div.before(span)
      span.append(div)
      textDivs[divIdx] = span
      div = span
    }

    const content = textContentItemsStr[divIdx].substring(fromOffset, toOffset)
    const node = document.createTextNode(content)

    if (className) {
      const span = document.createElement('span')
      span.className = `${className} appended`
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
  }
  else if (!isSelectedPage) {
    return
  }

  let lastDivIdx = -1
  let lastOffset = -1

  for (let i = i0; i < i1; i++) {
    const match = matches[i]
    const begin = match.begin

    if (begin.divIdx === lastDivIdx && begin.offset === lastOffset) {
      continue
    }

    lastDivIdx = begin.divIdx
    lastOffset = begin.offset

    const end = match.end
    const isSelected = isSelectedPage && i === selectedMatchIndex
    const highlightSuffix = isSelected ? ' selected' : ''

    let selectedLeft = 0
    if (!prevEnd || begin.divIdx !== prevEnd.divIdx) {
      if (prevEnd !== null) {
        appendTextToDiv(prevEnd.divIdx, prevEnd.offset, infinity.offset)
      }

      beginText(begin)
    }
    else {
      appendTextToDiv(prevEnd.divIdx, prevEnd.offset, begin.offset)
    }

    if (begin.divIdx === end.divIdx) {
      selectedLeft = appendTextToDiv(begin.divIdx, begin.offset, end.offset, 'highlight' + highlightSuffix)
    }
    else {
      selectedLeft = appendTextToDiv(begin.divIdx, begin.offset, infinity.offset, 'highlight begin' + highlightSuffix)

      for (let n0 = begin.divIdx + 1, n1 = end.divIdx; n0 < n1; n0++) {
        textDivs[n0].className = 'highlight middle' + highlightSuffix
      }

      beginText(end, 'highlight end' + highlightSuffix)
    }

    prevEnd = end

    if (isSelected) {
      findController.scrollMatchIntoView({
        element: textDivs[begin.divIdx],
        selectedLeft,
        pageIndex,
        matchIndex: selectedMatchIndex,
      })
    }
  }

  if (prevEnd) {
    appendTextToDiv(prevEnd.divIdx, prevEnd.offset, infinity.offset)
  }
}

const convertMatches = (items: string[], matches: (number[] | null), matchesLength?: (number[] | null)): Matches => {
  if (!matches || !matchesLength) return []

  let i = 0
  let iIndex = 0

  const end = items.length - 1
  const result: {
    begin: {
      divIdx: number
      offset: number
    }
    end: {
      divIdx: number
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
      divIdx: i,
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
        divIdx: i,
        offset: matchIndex - iIndex,
      },
    })
  }

  return result
}
