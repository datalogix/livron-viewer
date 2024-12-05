import { applyHighlightHCMFilter, createElement } from '@/utils'
import { Manager } from './'

export class ContainerManager extends Manager {
  private _container!: HTMLDivElement
  private _viewerContainer!: HTMLDivElement
  private previousContainerHeight = 0
  private _containerTopLeft?: [number, number]
  private resizeObserver = new ResizeObserver(this.onResizeObserver.bind(this))

  get rootContainer() {
    return this.container.parentElement ?? this.container
  }

  get container() {
    return this._container
  }

  get viewerContainer() {
    return this._viewerContainer
  }

  get isContainerRtl() {
    return getComputedStyle(this.container).direction === 'rtl'
  }

  get containerTopLeft() {
    return this._containerTopLeft ||= [this.container.offsetTop, this.container.offsetLeft]
  }

  init() {
    this._container = this.options.container ?? createElement('div')
    this._viewerContainer = createElement('div', 'pdfViewer', { id: 'viewer' })
    this.container.appendChild(this.viewerContainer)
    this.container.id = 'viewerContainer'
    this.resizeObserver.observe(this.container)
    this.updateContainerHeightCss()

    this.options.abortSignal?.addEventListener(
      'abort',
      () => this.resizeObserver.disconnect(),
      { once: true },
    )

    this.on('documentopen', () => this.rootContainer.classList.add('loading'))
    this.on(['documentloaded', 'documenterror', 'documentempty'], () => this.rootContainer.classList.remove('loading'))

    this.on('firstpageloaded', ({ pdfDocument, viewport }) => {
      this.setScaleFactor(viewport.scale)
      applyHighlightHCMFilter(this.container, this.viewer.pageColors, pdfDocument.filterFactory)
    })

    this.on('metadataloaded', ({ info }) => {
      if ('Language' in info && info.Language) {
        this.viewerContainer.lang = String(info.Language)
      }
    })
  }

  reset() {
    this.viewerContainer.textContent = ''
    this.viewerContainer.removeAttribute('lang')
  }

  containsElement(element: Node | null) {
    return this.container.contains(element)
  }

  focus() {
    this.container.focus()
  }

  setScaleFactor(scale: number) {
    this.viewerContainer.style.setProperty('--scale-factor', scale.toString())
  }

  private updateContainerHeightCss(height = this.container.clientHeight) {
    if (height !== this.previousContainerHeight) {
      this.previousContainerHeight = height
      document.documentElement.style.setProperty('--viewer-container-height', `${height}px`)
    }
  }

  private onResizeObserver(entries: ResizeObserverEntry[]) {
    for (const entry of entries) {
      if (entry.target === this.container) {
        this.updateContainerHeightCss(Math.floor(entry.borderBoxSize[0].blockSize))
        this._containerTopLeft = undefined
        break
      }
    }
  }
}
