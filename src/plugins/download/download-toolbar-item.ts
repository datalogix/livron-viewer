import { ToolbarAction } from '@/toolbar'
import { DownloadPlugin } from './download-plugin'

export class DownloadToolbarItem extends ToolbarAction {
  get enabled() {
    return true
  }

  protected execute() {
    this.viewer.getLayerProperty<DownloadPlugin>('DownloadPlugin')?.downloadOrSave()
  }
}
