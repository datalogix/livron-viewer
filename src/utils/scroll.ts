export function scrollIntoView(
  scrollEl: HTMLElement,
  element: HTMLElement,
  spot?: { top?: number, left?: number },
  scrollMatches?: boolean,
) {
  let offsetY = element.offsetTop - scrollEl.offsetTop
  let offsetX = element.offsetLeft - scrollEl.offsetLeft

  /*
  let parent = element.parentElement as HTMLElement

  if (!parent) {
    console.error('offsetParent is not set -- cannot scroll')
    return
  }

  let offsetY = element.offsetTop + element.clientTop
  let offsetX = element.offsetLeft + element.clientLeft

  const isSameHeightAndWidth = parent.clientHeight === parent.scrollHeight && parent.clientWidth === parent.scrollWidth
  const isMarkedOrHidden = parent.classList.contains('markedContent') || getComputedStyle(parent).overflow === 'hidden'

  while ((isSameHeightAndWidth || scrollMatches) && isMarkedOrHidden) {
    offsetY += parent.offsetTop
    offsetX += parent.offsetLeft
    parent = parent.parentElement as HTMLElement

    if (!parent) {
      return
    }
  }
  */

  if (spot) {
    if (spot.top !== undefined) {
      offsetY += spot.top
    }
    if (spot.left !== undefined) {
      offsetX += spot.left
      scrollEl.scrollLeft = offsetX
    }
  }

  scrollEl.scrollTop = offsetY
}

type ScrollState = {
  right: boolean
  down: boolean
  lastX: number
  lastY: number
  _eventHandler: (event: Event) => void
}

export function watchScroll(viewAreaElement: HTMLElement, callback: (state: ScrollState) => void, abortSignal?: AbortSignal) {
  let rAF: number | null = null

  const debounceScroll = function (_event: Event) {
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

  const state: ScrollState = {
    right: true,
    down: true,
    lastX: viewAreaElement.scrollLeft,
    lastY: viewAreaElement.scrollTop,
    _eventHandler: debounceScroll,
  }

  viewAreaElement.addEventListener('scroll', debounceScroll, {
    capture: true,
    signal: abortSignal,
  })

  return state
}
