import { ToolbarAction } from '@/toolbar'

export class PrevPage extends ToolbarAction {
  get enabled() {
    return this.viewer.hasPreviousPage()
  }

  protected init() {
    this.on('pagechanging', () => this.toggle())
  }

  protected execute() {
    this.viewer.previousPage()
  }
}
