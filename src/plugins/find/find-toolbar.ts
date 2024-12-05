import { ToolbarActionToggle } from '@/toolbar'
import { createElement } from '@/utils'
import { FindState } from './find-controller'

const MATCHES_COUNT_LIMIT = 1000

export class FindToolbar extends ToolbarActionToggle {
  protected bar?: HTMLDivElement
  protected findField?: HTMLInputElement
  protected highlightAll?: HTMLInputElement
  protected caseSensitive?: HTMLInputElement
  protected matchDiacritics?: HTMLInputElement
  protected entireWord?: HTMLInputElement
  protected findMsg?: HTMLSpanElement
  protected findResultsCount?: HTMLSpanElement
  protected findPreviousButton?: HTMLButtonElement
  protected findNextButton?: HTMLButtonElement

  init() {
    this.bar = createElement('div', 'findbar')
    this.findField = this.bar.appendChild(createElement('input', { type: 'text' }))
    this.highlightAll = createElement('input', { type: 'checkbox' })
    this.caseSensitive = createElement('input', { type: 'checkbox' })
    this.matchDiacritics = createElement('input', { type: 'checkbox' })
    this.entireWord = createElement('input', { type: 'checkbox' })
    this.findMsg = createElement('span')
    this.findResultsCount = createElement('span')
    this.findPreviousButton = createElement('button', { type: 'button' })
    this.findNextButton = createElement('button', { type: 'button' })

    this.findField.addEventListener('input', () => this.dispatchEvent(), { signal: this.signal })
    this.findPreviousButton.addEventListener('click', () => this.dispatchEvent('again', true), { signal: this.signal })
    this.findNextButton.addEventListener('click', () => this.dispatchEvent('again', false), { signal: this.signal })
    this.highlightAll.addEventListener('click', () => this.dispatchEvent('highlightallchange'), { signal: this.signal })
    this.caseSensitive.addEventListener('click', () => this.dispatchEvent('casesensitivitychange'), { signal: this.signal })
    this.entireWord.addEventListener('click', () => this.dispatchEvent('entirewordchange'), { signal: this.signal })
    this.matchDiacritics.addEventListener('click', () => this.dispatchEvent('diacriticmatchingchange'), { signal: this.signal })

    this.bar.addEventListener('keydown', (e) => {
      if (e.key == 'Enter' && e.target === this.findField) {
        this.dispatchEvent('again', e.shiftKey)
      }

      if (e.key == 'Escape') {
        this.close()
      }
    })

    this.bar.append(
      this.findField,
      this.findPreviousButton,
      this.findNextButton,
      this.highlightAll,
      this.caseSensitive,
      this.entireWord,
      this.matchDiacritics,
      this.findMsg,
      this.findResultsCount,
    )

    this.container.append(this.bar)

    this.on('updatefindmatchescount', ({ matchesCount }) => this.updateResultsCount(matchesCount))
    this.on('updatefindcontrolstate', params => this.updateUIState(params.state, params.previous, params.matchesCount))
    this.on('documentdestroy', () => this.reset())
  }

  destroy() {
    this.reset()

    this.bar?.remove()
    this.bar = undefined
  }

  reset() {
    this.updateUIState()
  }

  dispatchEvent(type = '', findPrev?: boolean) {
    this.dispatch('find', {
      type,
      query: this.findField?.value,
      caseSensitive: this.caseSensitive?.checked,
      entireWord: this.entireWord?.checked,
      highlightAll: this.highlightAll?.checked,
      findPrevious: findPrev,
      matchDiacritics: this.matchDiacritics?.checked,
    })
  }

  updateUIState(state?: FindState, previous?: boolean, matchesCount = {}) {
    if (!this.findField || !this.findMsg) return

    let message = ''
    let status = ''

    switch (state) {
      case FindState.FOUND:
        break
      case FindState.PENDING:
        status = 'pending'
        break
      case FindState.NOT_FOUND:
        message = this.l10n.get('find.not-found')
        status = 'notFound'
        break
      case FindState.WRAPPED:
        message = this.l10n.get(previous ? 'find.reached.top' : 'find.reached.bottom')
        break
    }

    this.findField.setAttribute('data-status', status)
    this.findField.setAttribute('aria-invalid', state === FindState.NOT_FOUND ? 'true' : 'false')
    this.findMsg.setAttribute('data-status', status)
    this.findMsg.textContent = message

    this.updateResultsCount(matchesCount)
  }

  updateResultsCount({ current = 0, total = 0 } = {}) {
    if (!this.findResultsCount) return

    if (total <= 0) {
      this.findResultsCount.textContent = ''
      return
    }

    const limit = MATCHES_COUNT_LIMIT

    this.findResultsCount.textContent = total > limit
      ? this.l10n.get('find.match.count-limit', { count: limit })
      : this.l10n.get('find.match.count', { current, count: total })
  }

  open() {
    if (!this.bar) return

    this.bar.classList.add('findbar-open')
    this.bar.hidden = false

    this.findField?.select()
    this.findField?.focus()
  }

  close() {
    if (!this.bar) return

    this.bar.classList.remove('findbar-open')
    this.bar.hidden = true

    this.dispatch('findbarclose')
  }
}
