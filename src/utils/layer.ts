import { PageViewport } from '@/pdfjs'

export function updateLayerDimensions(
  div: HTMLElement,
  viewport: PageViewport,
  mustFlip = false,
  mustRotate = true,
) {
  const { pageWidth, pageHeight } = viewport.rawDims as { pageWidth: number, pageHeight: number }
  const { style } = div

  const w = `var(--scale-factor) * ${pageWidth}px`
  const h = `var(--scale-factor) * ${pageHeight}px`
  const widthStr = `round(${w}, 1px)`
  const heightStr = `round(${h}, 1px)`

  if (!mustFlip || viewport.rotation % 180 === 0) {
    style.width = widthStr
    style.height = heightStr
  } else {
    style.width = heightStr
    style.height = widthStr
  }

  if (mustRotate) {
    div.setAttribute('data-main-rotation', viewport.rotation.toString())
  }
}
