import type { PDFDocumentProxy } from './types'
import { TextLayerMode } from './enums'
import { removeNullCharacters } from './utils'

export class CopyManager {
  private getAllTextInProgress = false
  private hiddenCopyElement?: HTMLDivElement
  private interruptCopyCondition = false
  private pdfDocument?: PDFDocumentProxy

  constructor(private readonly container: HTMLDivElement) {}

  start() {
    const element = this.hiddenCopyElement = document.createElement('div')
    element.id = 'hiddenCopyElement'
    return element
  }

  reset() {
    this.hiddenCopyElement?.remove()
    this.hiddenCopyElement = undefined
  }

  setDocument(pdfDocument: PDFDocumentProxy, textLayerMode: TextLayerMode, signal?: AbortSignal) {
    this.pdfDocument = pdfDocument

    if (this.hiddenCopyElement) {
      document.addEventListener('copy', this.copyCallback.bind(this, textLayerMode), {
        signal,
      })
    }
  }

  private async getAllText() {
    if (!this.pdfDocument) return null

    const texts = []
    const buffer = []
    for (let pageNum = 1, pagesCount = this.pdfDocument.numPages; pageNum <= pagesCount; ++pageNum) {
      if (this.interruptCopyCondition) {
        return null
      }

      buffer.length = 0

      const page = await this.pdfDocument.getPage(pageNum)
      const { items } = await page.getTextContent()

      for (const item of items) {
        if ('str' in item && item.str) {
          buffer.push(item.str)
        }
      
        if ('hasEOL' in item && item.hasEOL) {
          buffer.push('\n')
        }
      }

      texts.push(removeNullCharacters(buffer.join('')))
    }
    return texts.join('\n')
  }

  private copyCallback(textLayerMode: TextLayerMode, event: ClipboardEvent) {
    const selection = document.getSelection()

    if (!selection || !(selection.anchorNode && selection.focusNode && this.hiddenCopyElement && selection.containsNode(this.hiddenCopyElement))) {
      return
    }

    if (this.getAllTextInProgress || textLayerMode === TextLayerMode.ENABLE_PERMISSIONS) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    this.getAllTextInProgress = true
    const savedCursor = this.container.style.cursor
    this.container.style.cursor = 'wait'

    const interruptCopy = (ev: KeyboardEvent) => this.interruptCopyCondition = ev.key === 'Escape'
    window.addEventListener('keydown', interruptCopy)

    this.getAllText().then(async (text) => {
      if (text !== null) {
        await navigator.clipboard.writeText(text)
      }
    }).catch((reason) => {
      console.warn(`Something goes wrong when extracting the text: ${reason.message}`)
    }).finally(() => {
      this.getAllTextInProgress = false
      this.interruptCopyCondition = false
      window.removeEventListener('keydown', interruptCopy)
      this.container.style.cursor = savedCursor
    })

    event.preventDefault()
    event.stopPropagation()
  }
}