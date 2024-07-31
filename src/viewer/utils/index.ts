import { ScrollMode, SpreadMode } from '../enums'
import { VisibleElements } from '../types'

export function removeNullCharacters(str: string, replaceInvisible = false) {
  const invisibleCharsRegExp = /[\x00-\x1F]/g

  if (!invisibleCharsRegExp.test(str)) {
    return str
  }

  if (replaceInvisible) {
    return str.replaceAll(invisibleCharsRegExp, m => m === '\x00' ? '' : ' ')
  }

  return str.replaceAll('\x00', '')
}

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
    case 'TwoColumnLeft':
      spreadMode = SpreadMode.ODD
      break

    case 'TwoPageRight':
      scrollMode = ScrollMode.PAGE
    case 'TwoColumnRight':
      spreadMode = SpreadMode.EVEN
      break
  }

  return { scrollMode, spreadMode }
}

export function scrollIntoView(element, spot, scrollMatches = false) {
  let parent = element.offsetParent
  if (!parent) {
    console.error('offsetParent is not set -- cannot scroll')
    return
  }
  let offsetY = element.offsetTop + element.clientTop
  let offsetX = element.offsetLeft + element.clientLeft
  while (parent.clientHeight === parent.scrollHeight && parent.clientWidth === parent.scrollWidth || scrollMatches && (parent.classList.contains('markedContent') || getComputedStyle(parent).overflow === 'hidden')) {
    offsetY += parent.offsetTop
    offsetX += parent.offsetLeft
    parent = parent.offsetParent
    if (!parent) {
      return
    }
  }
  if (spot) {
    if (spot.top !== undefined) {
      offsetY += spot.top
    }
    if (spot.left !== undefined) {
      offsetX += spot.left
      parent.scrollLeft = offsetX
    }
  }
  parent.scrollTop = offsetY
}

export function binarySearchFirstItem(items: any[], condition: (arg0: any) => any, start = 0) {
  let minIndex = start
  let maxIndex = items.length - 1

  if (maxIndex < 0 || !condition(items[maxIndex])) {
    return items.length
  }

  if (condition(items[minIndex])) {
    return minIndex
  }

  while (minIndex < maxIndex) {
    const currentIndex = minIndex + maxIndex >> 1
    const currentItem = items[currentIndex]
    if (condition(currentItem)) {
      maxIndex = currentIndex
    }
    else {
      minIndex = currentIndex + 1
    }
  }
  return minIndex
}


export function getVisibleElements({
  scrollEl,
  pages,
  sortByVisibility = false,
  horizontal = false,
  rtl = false,
}): VisibleElements {
  const top = scrollEl.scrollTop,
    bottom = top + scrollEl.clientHeight
  const left = scrollEl.scrollLeft,
    right = left + scrollEl.clientWidth

  // Throughout this "generic" function, comments will assume we're working with
  // PDF document pages, which is the most important and complex case. In this
  // case, the visible elements we're actually interested is the page canvas,
  // which is contained in a wrapper which adds no padding/border/margin, which
  // is itself contained in `view.div` which adds no padding (but does add a
  // border). So, as specified in this function's doc comment, this function
  // does all of its work on the padding edge of the provided views, starting at
  // offsetLeft/Top (which includes margin) and adding clientLeft/Top (which is
  // the border). Adding clientWidth/Height gets us the bottom-right corner of
  // the padding edge.
  function isElementBottomAfterViewTop(page) {
    const element = page.div
    const elementBottom
      = element.offsetTop + element.clientTop + element.clientHeight
    return elementBottom > top
  }

  function isElementNextAfterViewHorizontally(page) {
    const element = page.div
    const elementLeft = element.offsetLeft + element.clientLeft
    const elementRight = elementLeft + element.clientWidth
    return rtl ? elementLeft < right : elementRight > left
  }

  const visible = [],
    ids = new Set<number>(),
    numViews = pages.length
  
  let firstVisibleElementInd = binarySearchFirstItem(
    pages,
    horizontal
      ? isElementNextAfterViewHorizontally
      : isElementBottomAfterViewTop,
  )

  // Please note the return value of the `binarySearchFirstItem` function when
  // no valid element is found (hence the `firstVisibleElementInd` check below).
  if (
    firstVisibleElementInd > 0
    && firstVisibleElementInd < numViews
    && !horizontal
  ) {
    // In wrapped scrolling (or vertical scrolling with spreads), with some page
    // sizes, isElementBottomAfterViewTop doesn't satisfy the binary search
    // condition: there can be pages with bottoms above the view top between
    // pages with bottoms below. This function detects and corrects that error;
    // see it for more comments.
    firstVisibleElementInd = backtrackBeforeAllVisibleElements(
      firstVisibleElementInd,
      pages,
      top,
    )
  }

  // lastEdge acts as a cutoff for us to stop looping, because we know all
  // subsequent pages will be hidden.
  //
  // When using wrapped scrolling or vertical scrolling with spreads, we can't
  // simply stop the first time we reach a page below the bottom of the view;
  // the tops of subsequent pages on the same row could still be visible. In
  // horizontal scrolling, we don't have that issue, so we can stop as soon as
  // we pass `right`, without needing the code below that handles the -1 case.
  let lastEdge = horizontal ? right : -1

  for (let i = firstVisibleElementInd; i < numViews; i++) {
    const page = pages[i],
      element = page.div
    const currentWidth = element.offsetLeft + element.clientLeft
    const currentHeight = element.offsetTop + element.clientTop
    const viewWidth = element.clientWidth,
      viewHeight = element.clientHeight
    const viewRight = currentWidth + viewWidth
    const viewBottom = currentHeight + viewHeight

    if (lastEdge === -1) {
      // As commented above, this is only needed in non-horizontal cases.
      // Setting lastEdge to the bottom of the first page that is partially
      // visible ensures that the next page fully below lastEdge is on the
      // next row, which has to be fully hidden along with all subsequent rows.
      if (viewBottom >= bottom) {
        lastEdge = viewBottom
      }
    }
    else if ((horizontal ? currentWidth : currentHeight) > lastEdge) {
      break
    }

    if (
      viewBottom <= top
      || currentHeight >= bottom
      || viewRight <= left
      || currentWidth >= right
    ) {
      continue
    }

    const hiddenHeight
      = Math.max(0, top - currentHeight) + Math.max(0, viewBottom - bottom)
    const hiddenWidth
      = Math.max(0, left - currentWidth) + Math.max(0, viewRight - right)

    const fractionHeight = (viewHeight - hiddenHeight) / viewHeight,
      fractionWidth = (viewWidth - hiddenWidth) / viewWidth
    const percent = (fractionHeight * fractionWidth * 100) | 0

    visible.push({
      id: page.id,
      x: currentWidth,
      y: currentHeight,
      page,
      percent,
      widthPercent: (fractionWidth * 100) | 0,
    })
    
    ids.add(page.id)
  }

  const first = visible[0],
    last = visible.at(-1)

  if (sortByVisibility) {
    visible.sort(function (a, b) {
      const pc = a.percent - b.percent
      if (Math.abs(pc) > 0.001) {
        return -pc
      }
      return a.id - b.id // ensure stability
    })
  }
  return { first, last, pages: visible, ids }
}

export function watchScroll(viewAreaElement, callback, abortSignal = undefined) {
  let rAF = null

  const debounceScroll = function (evt) {
    if (rAF) {
      return
    }

    // schedule an invocation of scroll for next animation frame.
    rAF = window.requestAnimationFrame(() => {
      rAF = null

      const currentX = viewAreaElement.scrollLeft
      const lastX = state.lastX
      if (currentX !== lastX) {
        state.right = currentX > lastX
      }
      state.lastX = currentX
      const currentY = viewAreaElement.scrollTop
      const lastY = state.lastY
      if (currentY !== lastY) {
        state.down = currentY > lastY
      }
      state.lastY = currentY
      callback(state)
    })
  }

  const state = {
    right: true,
    down: true,
    lastX: viewAreaElement.scrollLeft,
    lastY: viewAreaElement.scrollTop,
    _eventHandler: debounceScroll,
  }

  viewAreaElement.addEventListener('scroll', debounceScroll, {
    useCapture: true,
    signal: abortSignal,
  })

  return state
}

export function isPortraitOrientation(size) {
  return size.width <= size.height
}



export function isValidScrollMode(mode) {
  return (
    Number.isInteger(mode)
    && Object.values(ScrollMode).includes(mode)
    && mode !== ScrollMode.UNKNOWN
  )
}
export function isValidAnnotationEditorMode(mode) {
  return (
    Object.values(AnnotationEditorType).includes(mode)
    && mode !== AnnotationEditorType.DISABLE
  )
}
export function isValidRotation(angle) {
  return Number.isInteger(angle) && angle % 90 === 0
}
export function isValidSpreadMode(mode) {
  return (
    Number.isInteger(mode)
    && Object.values(SpreadMode).includes(mode)
    && mode !== SpreadMode.UNKNOWN
  )
}

export function approximateFraction(x) {
  if (Math.floor(x) === x) {
    return [x, 1]
  }
  const xinv = 1 / x
  const limit = 8
  if (xinv > limit) {
    return [1, limit]
  }
  else if (Math.floor(xinv) === xinv) {
    return [1, xinv]
  }
  const x_ = x > 1 ? xinv : x
  let a = 0,
    b = 1,
    c = 1,
    d = 1
  while (true) {
    const p = a + c,
      q = b + d
    if (q > limit) {
      break
    }
    if (x_ <= p / q) {
      c = p
      d = q
    }
    else {
      a = p
      b = q
    }
  }
  let result
  if (x_ - a / b < c / d - x_) {
    result = x_ === x ? [a, b] : [b, a]
  }
  else {
    result = x_ === x ? [c, d] : [d, c]
  }
  return result
}

export function roundToDivide(x, div) {
  const r = x % div
  return r === 0 ? x : Math.round(x - r + div)
}

export function setLayerDimensions(
  div,
  viewport,
  mustFlip = false,
  mustRotate = true,
) {
  const { pageWidth, pageHeight } = viewport.rawDims
  const { style } = div

  const w = `var(--scale-factor) * ${pageWidth}px`,
    h = `var(--scale-factor) * ${pageHeight}px`
  const widthStr = `round(${w}, 1px)`,
    heightStr = `round(${h}, 1px)`

  if (!mustFlip || viewport.rotation % 180 === 0) {
    style.width = widthStr
    style.height = heightStr
  }
  else {
    style.width = heightStr
    style.height = widthStr
  }
  
  if (mustRotate) {
    div.setAttribute('data-main-rotation', viewport.rotation)
  }
}


function backtrackBeforeAllVisibleElements(index, views, top) {
  // binarySearchFirstItem's assumption is that the input is ordered, with only
  // one index where the conditions flips from false to true: [false ...,
  // true...]. With vertical scrolling and spreads, it is possible to have
  // [false ..., true, false, true ...]. With wrapped scrolling we can have a
  // similar sequence, with many more mixed true and false in the middle.
  //
  // So there is no guarantee that the binary search yields the index of the
  // first visible element. It could have been any of the other visible elements
  // that were preceded by a hidden element.

  // Of course, if either this element or the previous (hidden) element is also
  // the first element, there's nothing to worry about.
  if (index < 2) {
    return index
  }

  // That aside, the possible cases are represented below.
  //
  //     ****  = fully hidden
  //     A*B*  = mix of partially visible and/or hidden pages
  //     CDEF  = fully visible
  //
  // (1) Binary search could have returned A, in which case we can stop.
  // (2) Binary search could also have returned B, in which case we need to
  // check the whole row.
  // (3) Binary search could also have returned C, in which case we need to
  // check the whole previous row.
  //
  // There's one other possibility:
  //
  //     ****  = fully hidden
  //     ABCD  = mix of fully and/or partially visible pages
  //
  // (4) Binary search could only have returned A.

  // Initially assume that we need to find the beginning of the current row
  // (case 1, 2, or 4), which means finding a page that is above the current
  // page's top. If the found page is partially visible, we're definitely not in
  // case 3, and this assumption is correct.
  let elt = views[index].div
  let pageTop = elt.offsetTop + elt.clientTop

  if (pageTop >= top) {
    // The found page is fully visible, so we're actually either in case 3 or 4,
    // and unfortunately we can't tell the difference between them without
    // scanning the entire previous row, so we just conservatively assume that
    // we do need to backtrack to that row. In both cases, the previous page is
    // in the previous row, so use its top instead.
    elt = views[index - 1].div
    pageTop = elt.offsetTop + elt.clientTop
  }

  // Now we backtrack to the first page that still has its bottom below
  // `pageTop`, which is the top of a page in the first visible row (unless
  // we're in case 4, in which case it's the row before that).
  // `index` is found by binary search, so the page at `index - 1` is
  // invisible and we can start looking for potentially visible pages from
  // `index - 2`. (However, if this loop terminates on its first iteration,
  // which is the case when pages are stacked vertically, `index` should remain
  // unchanged, so we use a distinct loop variable.)
  for (let i = index - 2; i >= 0; --i) {
    elt = views[i].div
    if (elt.offsetTop + elt.clientTop + elt.clientHeight <= pageTop) {
      // We have reached the previous row, so stop now.
      // This loop is expected to terminate relatively quickly because the
      // number of pages per row is expected to be small.
      break
    }
    index = i
  }
  return index
}