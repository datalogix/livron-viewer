import { type Toolbar, ToolbarItem } from '@/toolbar'
import { NextPage } from './next-page'
import { PrevPage } from './prev-page'
import { InputPage } from './input-page'

export class Paginate extends ToolbarItem {
  protected prevPage = new PrevPage()
  protected nextPage = new NextPage()
  protected inputPage = new InputPage()

  setToolbar(toolbar: Toolbar) {
    super.setToolbar(toolbar)
    this.prevPage.setToolbar(toolbar)
    this.nextPage.setToolbar(toolbar)
    this.inputPage.setToolbar(toolbar)
  }

  async initialize() {
    await super.initialize()
    await this.prevPage.initialize()
    await this.nextPage.initialize()
    await this.inputPage.initialize()
  }

  async terminate() {
    await this.prevPage.terminate()
    await this.nextPage.terminate()
    await this.inputPage.terminate()
    await super.terminate()
  }

  render() {
    this.container.appendChild(this.prevPage.render())
    this.container.appendChild(this.nextPage.render())
    this.container.appendChild(this.inputPage.render())

    return super.render()
  }
}
