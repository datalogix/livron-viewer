export function preventDefault() {
  return (event: MouseEvent) => event.preventDefault()
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  classesOrAttributes?: string | string[] | Record<string, any>,
  attributes?: Record<string, any>,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)
  let attrs = attributes || {}

  if (Array.isArray(classesOrAttributes)) {
    element.classList.add(...classesOrAttributes)
  } else if (typeof classesOrAttributes === 'string') {
    element.classList.add(classesOrAttributes)
  } else {
    attrs = Object.assign(attrs, classesOrAttributes || {})
  }

  for (const [key, value] of Object.entries(attrs)) {
    if (key in element) {
      (element as any)[key] = value
    } else {
      element.setAttribute(key, String(value))
    }
  }

  return element
}

export function dragElement(element: HTMLElement, handler?: HTMLElement) {
  let offsetX = 0
  let offsetY = 0
  handler ??= element

  const startDrag = (event: MouseEvent | TouchEvent) => {
    if (event instanceof TouchEvent) {
      offsetX = event.touches[0].clientX - element.offsetLeft
      offsetY = event.touches[0].clientY - element.offsetTop
      element.ownerDocument.addEventListener('touchmove', onDrag)
      element.ownerDocument.addEventListener('touchend', stopDrag)
    } else {
      offsetX = event.clientX - element.offsetLeft
      offsetY = event.clientY - element.offsetTop
      element.ownerDocument.addEventListener('mousemove', onDrag)
      element.ownerDocument.addEventListener('mouseup', stopDrag)
    }
  }

  const onDrag = (event: MouseEvent | TouchEvent) => {
    if (event instanceof TouchEvent) {
      element.style.left = `${event.touches[0].clientX - offsetX}px`
      element.style.top = `${event.touches[0].clientY - offsetY}px`
    } else {
      element.style.left = `${event.clientX - offsetX}px`
      element.style.top = `${event.clientY - offsetY}px`
    }
  }

  const stopDrag = (event: MouseEvent | TouchEvent) => {
    if (event instanceof TouchEvent) {
      element.ownerDocument.removeEventListener('touchmove', onDrag)
      element.ownerDocument.removeEventListener('touchend', stopDrag)
    } else {
      element.ownerDocument.removeEventListener('mousemove', onDrag)
      element.ownerDocument.removeEventListener('mouseup', stopDrag)
    }
  }

  handler.addEventListener('mousedown', startDrag)
  handler.addEventListener('touchstart', startDrag)
  handler.style.cursor = 'move'
  handler.oncontextmenu = preventDefault()
}
