import type { PDFDocumentProxy, ExternalServices, Scripting, Viewer } from './types'
import { RenderingStates } from './enums'
import { apiPageLayoutToViewerModes } from './utils'

export class ScriptingManager {
  private closeCapability?: PromiseWithResolvers<void>
  private destroyCapability?: PromiseWithResolvers<void>
  private willPrintCapability?: PromiseWithResolvers<void>

  private eventAbortController?: AbortController
  private pdfDocument?: PDFDocumentProxy
  private viewer?: Viewer
  private _ready: boolean = false
  private scripting?: Scripting
  private pageOpenPending = new Set<number>()
  private visitedPages = new Map<number, any>()

  constructor(public readonly options: {
    eventBus: any
    externalServices?: ExternalServices
    docProperties?: (pdfDocument: PDFDocumentProxy) => Promise<Object>
  }) { }

  setViewer(viewer: Viewer) {
    this.viewer = viewer
  }

  async setDocument(pdfDocument?: PDFDocumentProxy) {
    if (this.pdfDocument) {
      await this.destroyScripting()
    }

    this.pdfDocument = pdfDocument

    if (!pdfDocument) {
      return
    }

    const [objects, calculationOrder, docActions] = await Promise.all([
      pdfDocument.getFieldObjects(),
      pdfDocument.getCalculationOrderIds(),
      pdfDocument.getJSActions(),
    ])

    if (!objects && !docActions) {
      await this.destroyScripting()
      return
    }

    if (pdfDocument !== this.pdfDocument) {
      return
    }

    try {
      this.scripting = this.initScripting()
    }
    catch (error: any) {
      console.error(`setDocument: '${error.message}'.`)
      await this.destroyScripting()
      return
    }

    this.eventAbortController = new AbortController()

    this.options.eventBus.on('updatefromsandbox', ({ source, detail }: any) => {
      if (source === window) this.updateFromSandbox(detail)
    }, { signal: this.eventAbortController.signal })

    this.options.eventBus.on('dispatcheventinsandbox', ({ detail }: any) => {
      this.scripting?.dispatchEventInSandbox(detail)
    }, { signal: this.eventAbortController.signal })

    this.options.eventBus.on('pagechanging', ({ pageNumber, previous }: any) => {
      if (pageNumber === previous) return
      this.dispatchPageClose(previous)
      this.dispatchPageOpen(pageNumber)
    }, { signal: this.eventAbortController.signal })

    this.options.eventBus.on('pagerendered', ({ pageNumber }: any) => {
      if (!this.pageOpenPending.has(pageNumber)) return
      if (pageNumber !== this.viewer?.currentPageNumber) return
      this.dispatchPageOpen(pageNumber)
    }, { signal: this.eventAbortController.signal })

    this.options.eventBus.on('pagesdestroy', async () => {
      await this.dispatchPageClose(this.viewer!.currentPageNumber)
      await this.scripting?.dispatchEventInSandbox({ id: 'doc', name: 'WillClose' })
      this.closeCapability?.resolve()
    }, { signal: this.eventAbortController.signal })

    try {
      const docProperties = await this.options.docProperties?.(pdfDocument)

      if (pdfDocument !== this.pdfDocument) {
        return
      }

      await this.scripting?.createSandbox({
        objects,
        calculationOrder,
        appInfo: {
          platform: navigator.userAgent,
          language: navigator.language,
        },
        docInfo: {
          ...docProperties,
          actions: docActions,
        },
      })

      this.options.eventBus.dispatch('sandboxcreated', { source: this })
    }
    catch (error: any) {
      console.error(`setDocument: '${error.message}'.`)
      await this.destroyScripting()
      return
    }

    await this.scripting?.dispatchEventInSandbox({ id: 'doc', name: 'Open' })
    await this.dispatchPageOpen(this.viewer!.currentPageNumber, true)

    Promise.resolve().then(() => {
      if (pdfDocument === this.pdfDocument) {
        this._ready = true
      }
    })
  }

  async dispatchWillSave() {
    return this.scripting?.dispatchEventInSandbox({ id: 'doc', name: 'WillSave' })
  }

  async dispatchDidSave() {
    return this.scripting?.dispatchEventInSandbox({ id: 'doc', name: 'DidSave' })
  }

  async dispatchWillPrint() {
    if (!this.scripting) {
      return
    }

    await this.willPrintCapability?.promise
    this.willPrintCapability = Promise.withResolvers()

    try {
      await this.scripting.dispatchEventInSandbox({ id: 'doc', name: 'WillPrint' })
    }
    catch (ex) {
      this.willPrintCapability?.resolve()
      this.willPrintCapability = undefined
      throw ex
    }

    await this.willPrintCapability.promise
  }

  async dispatchDidPrint() {
    return this.scripting?.dispatchEventInSandbox({ id: 'doc', name: 'DidPrint' })
  }

  get destroyPromise() {
    return this.destroyCapability?.promise || null
  }

  get ready() {
    return this._ready
  }

  private async updateFromSandbox(detail: any) {
    const isInPresentationMode = this.viewer?.isInPresentationMode || this.viewer?.isChangingPresentationMode

    if (!detail.id) {
      switch (detail.command) {
        case 'clear':
          console.clear()
          break

        case 'error':
          console.error(detail.value)
          break

        case 'layout':
          if (!isInPresentationMode) {
            const modes = apiPageLayoutToViewerModes(detail.value)
            this.viewer!.spreadMode = modes.spreadMode
          }
          break

        case 'page-num':
          this.viewer!.currentPageNumber = detail.value + 1
          break

        case 'print':
          await this.viewer?.pagesPromise
          this.options.eventBus.dispatch('print', { source: this })
          break

        case 'println':
          console.log(detail.value)
          break

        case 'zoom':
          if (!isInPresentationMode) {
            this.viewer!.currentScaleValue = detail.value
          }
          break

        case 'SaveAs':
          this.options.eventBus.dispatch('download', { source: this })
          break

        case 'FirstPage':
          this.viewer!.currentPageNumber = 1
          break

        case 'LastPage':
          this.viewer!.currentPageNumber = this.viewer!.pagesCount
          break

        case 'NextPage':
          this.viewer?.nextPage()
          break

        case 'PrevPage':
          this.viewer?.previousPage()
          break

        case 'ZoomViewIn':
          if (!isInPresentationMode) {
            this.viewer?.increaseScale()
          }
          break

        case 'ZoomViewOut':
          if (!isInPresentationMode) {
            this.viewer?.decreaseScale()
          }
          break

        case 'WillPrintFinished':
          this.willPrintCapability?.resolve()
          this.willPrintCapability = undefined
          break
      }

      return
    }

    if (isInPresentationMode && detail.focus) {
      return
    }

    const ids = detail.siblings ? [detail.id, ...detail.siblings] : [detail.id]

    delete detail.id
    delete detail.siblings

    for (const elementId of ids) {
      const element = document.querySelector(`[data-element-id="${elementId}"]`)

      if (element) {
        element.dispatchEvent(new CustomEvent('updatefromsandbox', { detail }))
      }
      else {
        this.pdfDocument?.annotationStorage.setValue(elementId, detail)
      }
    }
  }

  private async dispatchPageOpen(pageNumber: number, initialize: boolean = false) {
    const pdfDocument = this.pdfDocument

    if (initialize) {
      this.closeCapability = Promise.withResolvers()
    }

    if (!this.closeCapability) {
      return
    }

    const page = this.viewer?.getPage(pageNumber - 1)

    if (page?.renderingState !== RenderingStates.FINISHED) {
      this.pageOpenPending.add(pageNumber)
      return
    }

    this.pageOpenPending.delete(pageNumber)

    const actionsPromise = (async () => {
      const actions = await (!this.visitedPages.has(pageNumber) ? page.pdfPage?.getJSActions() : null)

      if (pdfDocument !== this.pdfDocument) {
        return
      }

      await this.scripting?.dispatchEventInSandbox({
        id: 'page',
        name: 'PageOpen',
        pageNumber,
        actions,
      })
    })()

    this.visitedPages.set(pageNumber, actionsPromise)
  }

  private async dispatchPageClose(pageNumber: number) {
    const pdfDocument = this.pdfDocument

    if (!this.closeCapability) {
      return
    }

    if (this.pageOpenPending.has(pageNumber)) {
      return
    }

    const actionsPromise = this.visitedPages.get(pageNumber)
    if (!actionsPromise) {
      return
    }

    this.visitedPages.set(pageNumber, null)

    await actionsPromise

    if (pdfDocument !== this.pdfDocument) {
      return
    }

    await this.scripting?.dispatchEventInSandbox({
      id: 'page',
      name: 'PageClose',
      pageNumber,
    })
  }

  private initScripting() {
    this.destroyCapability = Promise.withResolvers()

    if (this.scripting) {
      throw new Error('initScripting: Scripting already exists.')
    }

    return this.options.externalServices?.createScripting()
  }

  private async destroyScripting() {
    if (!this.scripting) {
      this.pdfDocument = undefined
      this.destroyCapability?.resolve()
      return
    }

    if (this.closeCapability) {
      await Promise.race([
        this.closeCapability.promise,
        new Promise((resolve) => { setTimeout(resolve, 1000) }),
      ]).catch(() => { })

      this.closeCapability = undefined
    }

    this.pdfDocument = undefined

    try {
      await this.scripting.destroySandbox()
    }
    catch { }

    this.willPrintCapability?.reject(new Error('Scripting destroyed.'))
    this.willPrintCapability = undefined
    this.eventAbortController?.abort()
    this.eventAbortController = undefined
    this.pageOpenPending.clear()
    this.visitedPages.clear()
    this.scripting = undefined
    this._ready = false
    this.destroyCapability?.resolve()
  }
}
