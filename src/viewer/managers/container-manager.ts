import { createElement } from '@/utils'
import { Manager } from './'

export class ContainerManager extends Manager {
  private _container!: HTMLDivElement
  private _viewerContainer!: HTMLDivElement
  private previousContainerHeight = 0
  private containerTopLeft?: [number, number]
  private resizeObserver = new ResizeObserver(this.onResizeObserver.bind(this))

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

    this.on('firstpageloaded', ({ viewport }) => {
      this.setScaleFactor(viewport.scale)
    })

    this.on('documentinit', () => {
      this.focus()

      this.pdfDocument?.getMetadata().then(({ info }) => {
        if ('Language' in info) {
          this.viewerContainer.lang = String(info.Language)
        }
      })
    })
  }

  reset() {
    this.viewerContainer.textContent = ''
    this.viewerContainer.removeAttribute('lang')
  }

  getContainer() {
    return this._container
  }

  getViewerContainer() {
    return this._viewerContainer
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

  get isContainerRtl() {
    return getComputedStyle(this.container).direction === 'rtl'
  }

  getContainerTopLeft() {
    return this.containerTopLeft ||= [this.container.offsetTop, this.container.offsetLeft]
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
        this.containerTopLeft = undefined
        break
      }
    }
  }
}
