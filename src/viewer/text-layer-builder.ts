import type { TextAccessibilityManager } from './text-accessibility-manager'
import type { TextHighlighter } from './text-highlighter'
import type { PDFPageProxy, PageViewport, getTextContentParameters } from './types'
import { TextLayer, normalizeUnicode } from './pdfjs'
import { removeNullCharacters } from './utils'

export class TextLayerBuilder {
  public div: HTMLElement

  private renderingDone = false

  private _textLayer?: TextLayer

  private static textLayers = new Map<HTMLElement, HTMLElement>()

  private static selectionChangeAbortController?: AbortController

  constructor(public readonly options: {
    pdfPage: PDFPageProxy
    highlighter?: TextHighlighter
    accessibilityManager?: TextAccessibilityManager
    enablePermissions?: boolean
    onAppend?: (div: HTMLElement) => void
  }) {
    this.div = document.createElement('div')
    this.div.tabIndex = 0
    this.div.className = 'textLayer'
  }

  get textLayer() {
    return this._textLayer
  }

  async render(viewport: PageViewport, textContentParams?: getTextContentParameters) {
    if (this.renderingDone && this._textLayer) {
      this._textLayer.update({
        viewport,
        onBefore: this.hide.bind(this),
      })
      this.show()
      return
    }

    this.cancel()

    this._textLayer = new TextLayer({
      textContentSource: this.options.pdfPage.streamTextContent(textContentParams || {
        includeMarkedContent: true,
        disableNormalization: true,
      }),
      container: this.div,
      viewport,
    })

    this.options.highlighter?.setTextMapping(
      this._textLayer.textDivs,
      this._textLayer.textContentItemsStr,
    )
    this.options.accessibilityManager?.setTextMapping(this._textLayer.textDivs)

    await this._textLayer.render()

    this.finishRendering()

    this.options.onAppend?.(this.div)
    this.options.highlighter?.enable()
    this.options.accessibilityManager?.enable()
  }

  hide() {
    if (!this.div.hidden && this.renderingDone) {
      this.options.highlighter?.disable()
      this.div.hidden = true
    }
  }

  show() {
    if (this.div.hidden && this.renderingDone) {
      this.div.hidden = false
      this.options.highlighter?.enable()
    }
  }

  cancel() {
    this._textLayer?.cancel()
    this._textLayer = undefined
    this.options.highlighter?.disable()
    this.options.accessibilityManager?.disable()

    TextLayerBuilder.removeGlobalSelectionListener(this.div)
  }

  private finishRendering() {
    this.renderingDone = true
    const endOfContent = document.createElement('div')
    endOfContent.className = 'endOfContent'
    this.div.append(endOfContent)
    this.bindMouse(endOfContent)
  }

  private bindMouse(end: HTMLElement) {
    const { div } = this

    div.addEventListener(
      'mousedown',
      (evt) => {
        end.classList.add('active')
      },
    )

    div.addEventListener(
      'copy',
      (event) => {
        if (!this.options.enablePermissions) {
          const selection = document.getSelection()
          event.clipboardData?.setData(
            'text/plain',
            removeNullCharacters(normalizeUnicode(selection?.toString())),
          )
        }

        event.preventDefault()
        event.stopPropagation()
      },
    )

    TextLayerBuilder.textLayers.set(
      div,
      end,
    )
    TextLayerBuilder.enableGlobalSelectionListener()
  }

  private static removeGlobalSelectionListener(textLayerDiv: HTMLElement) {
    this.textLayers.delete(textLayerDiv)

    if (this.textLayers.size === 0) {
      this.selectionChangeAbortController?.abort()
      this.selectionChangeAbortController = undefined
    }
  }

  private static enableGlobalSelectionListener() {
    if (this.selectionChangeAbortController) {
      return
    }

    this.selectionChangeAbortController = new AbortController()

    const reset = (end: HTMLElement, textLayer: HTMLElement) => {
      textLayer.append(end)
      end.style.width = ''
      end.style.height = ''
      end.classList.remove('active')
    }

    document.addEventListener(
      'pointerup',
      () => this.textLayers.forEach(reset),
      { signal: this.selectionChangeAbortController.signal },
    )

    let isFirefox: boolean
    let prevRange: Range

    document.addEventListener(
      'selectionchange',
      () => {
        const selection = document.getSelection()

        if (!selection || selection.rangeCount === 0) {
          this.textLayers.forEach(reset)
          return
        }

        const activeTextLayers = new Set()

        for (let i = 0; i < selection.rangeCount; i++) {
          const range = selection.getRangeAt(i)

          for (const textLayerDiv of this.textLayers.keys()) {
            if (!activeTextLayers.has(textLayerDiv) && range.intersectsNode(textLayerDiv)) {
              activeTextLayers.add(textLayerDiv)
            }
          }
        }

        for (const [
          textLayerDiv,
          endDiv,
        ] of this.textLayers) {
          if (activeTextLayers.has(textLayerDiv)) {
            endDiv.classList.add('active')
          }
          else {
            reset(
              endDiv,
              textLayerDiv,
            )
          }
        }

        isFirefox ??= getComputedStyle(this.textLayers.values().next().value).getPropertyValue('-moz-user-select') === 'none'

        if (isFirefox) {
          return
        }

        const range = selection.getRangeAt(0)
        const modifyStart = prevRange && (range.compareBoundaryPoints(
          Range.END_TO_END,
          prevRange,
        ) === 0 || range.compareBoundaryPoints(
          Range.START_TO_END,
          prevRange,
        ) === 0)

        let anchor = modifyStart
          ? range.startContainer
          : range.endContainer

        if (anchor.nodeType === Node.TEXT_NODE) {
          anchor = anchor.parentNode!
        }

        const parentTextLayer = anchor.parentElement?.closest('.textLayer') as HTMLElement
        const endDiv = this.textLayers.get(parentTextLayer)

        if (endDiv) {
          endDiv.style.width = parentTextLayer.style.width
          endDiv.style.height = parentTextLayer.style.height
          anchor.parentElement?.insertBefore(
            endDiv,
            modifyStart
              ? anchor
              : anchor.nextSibling,
          )
        }

        prevRange = range.cloneRange()
      },
      { signal: this.selectionChangeAbortController.signal },
    )
  }
}
