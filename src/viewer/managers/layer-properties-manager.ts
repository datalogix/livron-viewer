import { Manager } from './'

export class LayerPropertiesManager extends Manager {
  private properties = new Map<string, any>()

  getLayerProperty<T>(key: string): T | undefined {
    return this.properties.get(key) as T | undefined
  }

  addLayerProperty<T>(key: string, value: T) {
    this.properties.set(key, value)
  }

  removeLayerProperty(key: string) {
    this.properties.delete(key)
  }
}
