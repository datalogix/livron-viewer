import { ToolbarAction } from '@/toolbar'
import { createElement } from '@/utils'

export class Open extends ToolbarAction {
  protected fileInput?: HTMLInputElement
  protected dropzone?: HTMLDivElement

  get enabled() {
    return true
  }

  protected init() {
    this.on('documenterror', () => this.enable())
    this.on('fileinputchange', ({ file }) => {
      if (this.viewer.isInPresentationMode) return

      this.viewer.openDocument(URL.createObjectURL(file), file.name)
    })

    const container = this.viewer.container
    this.setupFileInput(container)
    this.setupDropzone(container)
    this.enable()
  }

  protected destroy() {
    this.fileInput?.remove()
    this.fileInput = undefined
    this.dropzone?.remove()
    this.dropzone = undefined
  }

  protected execute() {
    this.fileInput?.click()
  }

  private setupFileInput(container: HTMLDivElement) {
    const fileInput = this.fileInput = createElement('input', {
      type: 'file',
      id: 'file-input',
      hidden: true,
    })

    fileInput.addEventListener('change', (e) => {
      const { files } = e.target as HTMLInputElement

      if (!files || files.length === 0) {
        return
      }

      this.dispatch('fileinputchange', { file: files[0] })
      fileInput.value = ''
    })

    container.appendChild(fileInput)
  }

  private setupDropzone(container: HTMLDivElement) {
    const dropzone = this.dropzone = container.appendChild(createElement('div', 'dropzone'))

    this.on('documentload', () => {
      dropzone.hidden = true
    })

    this.on(['documentempty', 'documenterror'], () => {
      dropzone.hidden = false
    })

    container.addEventListener('dragover', (e) => {
      if (!e.dataTransfer) return

      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        if (e.dataTransfer.items[i].type === 'application/pdf') {
          e.dataTransfer.dropEffect = e.dataTransfer.effectAllowed === 'copy' ? 'copy' : 'move'
          dropzone.classList.add('dragover')
          e.preventDefault()
          e.stopPropagation()
          return
        }
      }
    })

    container.addEventListener('dragleave', (e) => {
      if (!container.contains(e.relatedTarget as HTMLDivElement)) {
        dropzone.classList.remove('dragover')
      }
    })

    container.addEventListener('drop', (e) => {
      if (e.dataTransfer?.files?.[0].type !== 'application/pdf') return
      dropzone.classList.remove('dragover')

      e.preventDefault()
      e.stopPropagation()

      this.dispatch('fileinputchange', { file: e.dataTransfer.files[0] })
    })
  }
}
