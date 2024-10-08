import { ToolbarActionToggle } from '@/toolbar'
import { Modal, ProgressBar } from '@/tools'
import { createElement } from '@/utils'

export class ProgressTracker extends ToolbarActionToggle {
  open() {
    const div = createElement('div', 'progress-tracker')
    div.appendChild(this.item('Tempo de utilização', '10:00'))
    div.appendChild(this.item('Páginas visualizadas', 0, 3))
    div.appendChild(this.item('Interações visualizadas', 2, 2))
    div.appendChild(this.item('Resultado das atividades', 10, 20))

    Modal.open(div, {
      title: 'Progress Tracker',
      backdrop: 'overlay',
      onClose: () => this.execute(),
    })
  }

  close() {
    Modal.close()
  }

  private item(title: string, value: string | number, total?: number) {
    const header = createElement('header', 'header')
    header.appendChild(createElement('span', 'title', { innerText: title }))
    header.appendChild(createElement('span', 'total', {
      innerText: typeof total === 'number' ? `${value} de ${total}` : value,
    }))

    const div = createElement('div', 'item')
    div.appendChild(header)

    if (typeof total === 'number' && typeof value === 'number') {
      const progressBar = new ProgressBar(total, value)
      div.appendChild(progressBar.render())
    }

    return div
  }
}
