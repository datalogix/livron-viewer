import type { InferCallback, ListenerAbort, ListenerCallback, ListenerKeys, ListenerOptions, Listeners } from './types'

export class EventBus<
  ListenersT extends Record<string, any> = Record<string, ListenerCallback>,
  ListenerNameT extends ListenerKeys<ListenersT> = ListenerKeys<ListenersT>
> {
  private listeners: Listeners = {}

  dispatch<NameT extends ListenerNameT>(name: NameT, ...data: Parameters<InferCallback<ListenersT, NameT>>) {
    const eventListeners = this.listeners[name]
    if (!eventListeners || eventListeners.length === 0) {
      return
    }

    let externalListeners: ListenerCallback[] = []

    for (const evt of eventListeners.slice(0)) {
      if (evt.once) {
        this.off(name, evt.listener as InferCallback<ListenersT, NameT>)
      }

      if (evt.external) {
        externalListeners.push(evt.listener)
        continue
      }

      evt.listener(...data)
    }

    if (externalListeners) {
      for (const listener of externalListeners) {
        listener(...data)
      }

      externalListeners = []
    }
  }

  on<NameT extends ListenerNameT>(name: NameT, listener: InferCallback<ListenersT, NameT>, options: ListenerOptions = {}) {
    let rmAbort: ListenerAbort|undefined = undefined

    if (options.signal instanceof AbortSignal) {
      if (options.signal.aborted) {
        console.error('Cannot use an `aborted` signal.')
        return
      }

      const onAbort = () => this.off(name, listener)
      rmAbort = () => options.signal?.removeEventListener('abort', onAbort)
      options.signal.addEventListener('abort', onAbort)
    }

    const eventListeners = this.listeners[name] ||= []
    eventListeners.push({
      listener,
      external: options.external === undefined ? true : options.external,
      once: options.once === true,
      rmAbort,
    })
  }

  off<NameT extends ListenerNameT>(name: NameT, listener: InferCallback<ListenersT, NameT>) {
    const eventListeners = this.listeners[name]
    if (!eventListeners || eventListeners.length === 0) {
      return
    }

    for (let i = 0, ii = eventListeners.length; i < ii; i++) {
      const evt = eventListeners[i]
      if (evt.listener === listener) {
        evt.rmAbort?.()
        eventListeners.splice(i, 1)
        return
      }
    }
  }
}
