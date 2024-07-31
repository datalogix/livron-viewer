import { DrawLayer } from './pdfjs'

export class DrawLayerBuilder {
  private drawLayer?: DrawLayer
  private cancelled: boolean = false

  constructor(private readonly pageIndex: number) { }

  async render(intent = 'display') {
    if (intent !== 'display' || this.drawLayer || this.cancelled) {
      return
    }

    this.drawLayer = new DrawLayer({
      pageIndex: this.pageIndex,
    })
  }

  cancel() {
    this.cancelled = true
    this.drawLayer?.destroy()
    this.drawLayer = undefined
  }

  setParent(parent: any) {
    this.drawLayer?.setParent(parent)
  }

  getDrawLayer() {
    return this.drawLayer
  }
}
