import type { EventBus, ListenerCallback, ListenerOptions } from '@/bus'

export abstract class Dispatcher {
  abstract get eventBus(): EventBus

  get signal(): AbortSignal | undefined {
    return undefined
  }

  on(name: string, listener: ListenerCallback, options?: ListenerOptions) {
    this.eventBus.on(name, listener, {
      signal: this.signal,
      ...options,
    })
  }

  off(name: string, listener?: ListenerCallback) {
    this.eventBus.off(name, listener)
  }

  dispatch(name: string, data = {}) {
    this.eventBus.dispatch(name, { source: this, ...data })
  }
}
