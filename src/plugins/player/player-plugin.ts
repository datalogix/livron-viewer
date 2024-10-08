import { Modal } from '@/tools'
import { createElement } from '@/utils'
import { Plugin } from '../plugin'

export class PlayerPlugin extends Plugin {
  protected init() {
    this.on('playeradd', ({ source }) => {
      PlayerPlugin.play(source)
    })
  }

  protected destroy() {
    Modal.close()
  }

  static play(source: string) {
    const media = createElement(source.endsWith('.mp4') ? 'video' : 'audio', {
      controlsList: 'nodownload',
      src: source,
      controls: true,
      autoplay: true,
    })

    Modal.open(media, { draggable: true }).classList.add('player')
  }
}
