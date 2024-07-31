import type { StructTreeNode, StructTreeContent } from './types'
import { removeNullCharacters } from './utils'

export class StructTreeLayerBuilder {
  private treeDom?: HTMLElement

  get renderingDone() {
    return this.treeDom !== undefined
  }

  render(structTree?: StructTreeNode) {
    if (this.treeDom !== undefined) {
      return this.treeDom
    }

    const treeDom = this.walk(structTree)
    treeDom?.classList.add('structTree')

    return this.treeDom = treeDom
  }

  hide() {
    if (this.treeDom && !this.treeDom.hidden) {
      this.treeDom.hidden = true
    }
  }

  show() {
    if (this.treeDom?.hidden) {
      this.treeDom.hidden = false
    }
  }

  private setAttributes(structElement: StructTreeNode | StructTreeContent, htmlElement: HTMLElement) {
    // @ts-ignore
    const { alt, id, lang } = structElement

    if (alt !== undefined) {
      htmlElement.setAttribute('aria-label', removeNullCharacters(alt))
    }

    if (id !== undefined) {
      htmlElement.setAttribute('aria-owns', id)
    }

    if (lang !== undefined) {
      htmlElement.setAttribute('lang', removeNullCharacters(lang, true))
    }
  }

  private walk(node?: StructTreeNode | StructTreeContent) {
    if (!node) return

    const element = document.createElement('span')

    if ('role' in node) {
      const match = node.role.match(HEADING_PATTERN)
      const role = PDF_ROLE_TO_HTML_ROLE[node.role as keyof typeof PDF_ROLE_TO_HTML_ROLE]

      if (match) {
        element.setAttribute('role', 'heading')
        element.setAttribute('aria-level', match[1])
      }
      else if (role) {
        element.setAttribute('role', role)
      }
    }

    this.setAttributes(node, element)

    if ('children' in node) {
      if (node.children.length === 1 && 'id' in node.children[0]) {
        this.setAttributes(node.children[0], element)
      }
      else {
        for (const kid of node.children) {
          // @ts-ignore
          element.append(this.walk(kid))
        }
      }
    }

    return element
  }
}

const HEADING_PATTERN = /^H(\d+)$/
const PDF_ROLE_TO_HTML_ROLE = {
  Document: null,
  DocumentFragment: null,
  Part: 'group',
  Sect: 'group',
  Div: 'group',
  Aside: 'note',
  NonStruct: 'none',
  P: null,
  H: 'heading',
  Title: null,
  FENote: 'note',
  Sub: 'group',
  Lbl: null,
  Span: null,
  Em: null,
  Strong: null,
  Link: 'link',
  Annot: 'note',
  Form: 'form',
  Ruby: null,
  RB: null,
  RT: null,
  RP: null,
  Warichu: null,
  WT: null,
  WP: null,
  L: 'list',
  LI: 'listitem',
  LBody: null,
  Table: 'table',
  TR: 'row',
  TH: 'columnheader',
  TD: 'cell',
  THead: 'columnheader',
  TBody: null,
  TFoot: null,
  Caption: null,
  Figure: 'figure',
  Formula: null,
  Artifact: null,
}
