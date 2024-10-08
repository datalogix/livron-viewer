import { ToolbarAction } from '@/toolbar'

export class PresentationMode extends ToolbarAction {
  get enabled() {
    return this.viewer.container.ownerDocument.fullscreenEnabled
  }

  protected execute() {
    this.dispatch('presentationrequest')
  }
}
