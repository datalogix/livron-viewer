import { getResolvedPDFJS } from 'unpdf'
import type { IRenderableView as BaseIRenderableView, IL10n } from 'pdfjs-dist/types/web/interfaces'
import type { OptionalContentConfig } from 'pdfjs-dist/types/src/display/optional_content_config'
import type { AnnotationStorage } from 'pdfjs-dist/types/src/display/annotation_storage'
import type { StructTreeNode, StructTreeContent, getTextContentParameters, RenderParameters } from 'pdfjs-dist/types/src/display/api'
import type { AnnotationLayerParameters } from 'pdfjs-dist/types/src/display/annotation_layer'
import type { AnnotationEditor } from 'pdfjs-dist/types/src/display/editor/editor'
import type { AnnotationEditorLayerOptions } from 'pdfjs-dist/types/src/display/editor/annotation_editor_layer'
import type { XfaLayerParameters } from 'pdfjs-dist/types/src/display/xfa_layer'
import type { DocumentInitParameters } from 'unpdf/dist/types/src/display/api'
import type { PDFDocumentProxy } from 'pdfjs-dist'

/* TODO: revisar */
export * from 'pdfjs-dist'

export type DocumentType = string | URL | ArrayBuffer | DocumentInitParameters

interface IRenderableView extends BaseIRenderableView {
  get isRenderingFinished(): boolean
}

export type {
  IL10n,
  AnnotationEditorLayerOptions,
  RenderParameters,
  IRenderableView,
  OptionalContentConfig,
  AnnotationStorage,
  StructTreeNode,
  StructTreeContent,
  getTextContentParameters,
  AnnotationLayerParameters,
  AnnotationEditor,
  XfaLayerParameters,
}

export async function loadDocument(document?: DocumentType) {
  if (!document) return undefined

  if (document.constructor.name === 'PDFDocumentProxy') {
    return document as PDFDocumentProxy
  }

  try {
    const { getDocument } = await getResolvedPDFJS()
    return await getDocument(document).promise as any as PDFDocumentProxy
  } catch {
    return undefined
  }
}
