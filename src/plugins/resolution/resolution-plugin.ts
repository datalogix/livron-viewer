import { Plugin } from '../plugin'

export class ResolutionPlugin extends Plugin {
  private onChangeListener = this.onChange.bind(this)

  protected init() {
    this.onChangeListener()
  }

  protected destroy() {
    const mediaQueryList = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)

    mediaQueryList.removeEventListener('change', this.onChangeListener)
  }

  private onChange(event?: MediaQueryListEvent) {
    if (event) this.viewer.refresh()

    const mediaQueryList = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)

    mediaQueryList.addEventListener('change', this.onChangeListener, { once: true, signal: this.signal })
  }
}
