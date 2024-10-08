import type { LayerBuilder } from '@/viewer'
import { Plugin } from '../plugin'
import { TextHighlighter } from './text-highlighter'

export class TextHighlighterPlugin extends Plugin {
  private textHighlighters = new Map<number, TextHighlighter>()

  protected getTextHighlighter(layerBuilder: LayerBuilder) {
    if (!this.textHighlighters.has(layerBuilder.id)) {
      this.textHighlighters.set(layerBuilder.id, new TextHighlighter(
        layerBuilder.id - 1,
        layerBuilder.eventBus,
        layerBuilder.layerProperties.getLayerProperty('findplugin'),
      ))
    }

    return this.textHighlighters.get(layerBuilder.id)
  }

  protected init(): Promise<void> | void {
    this.on('textlayerbuildershow', ({ source }) => this.getTextHighlighter(source)?.enable())
    this.on('textlayerbuilderhide', ({ source }) => this.getTextHighlighter(source)?.disable())
    this.on('textlayerbuildercancel', ({ source }) => this.getTextHighlighter(source)?.disable())
    this.on('textlayerbuilderrender', ({ source }) => {
      const textHighlighter = this.getTextHighlighter(source)
      textHighlighter?.setTextMapping(source.textLayer.textDivs, source.textLayer.textContentItemsStr)
      queueMicrotask(() => textHighlighter?.enable())
    })

    this.on('xfalayerbuildercancel', ({ source }) => this.getTextHighlighter(source)?.disable())
    this.on('xfalayerbuilderrender', ({ source, textDivs, items }) => {
      const textHighlighter = this.getTextHighlighter(source)
      textHighlighter?.setTextMapping(textDivs, items)
      textHighlighter?.enable()
    })
  }

  protected destroy(): Promise<void> | void {
    this.textHighlighters.clear()
  }
}
