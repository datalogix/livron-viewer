import { AnnotationEditorType } from '@/pdfjs'
import { PresentationModeState } from '@/enums'
import { Plugin } from '../plugin'
import { HandTool } from './hand-tool'

export enum CursorTool {
  SELECT = 0,
  HAND = 1,
}

export class CursorPlugin extends Plugin {
  private active = CursorTool.SELECT
  private prevActive?: CursorTool
  private handTool?: HandTool

  protected init() {
    this.handTool = new HandTool(this.container)

    this.on('switchcursortool', (evt: { reset: boolean, tool: CursorTool }) => {
      if (!evt.reset) {
        this.switchTool(evt.tool)
        return
      }

      if (this.prevActive !== null) {
        annotationEditorMode = AnnotationEditorType.NONE
        presentationModeState = PresentationModeState.NORMAL

        enableActive()
      }
    })

    let annotationEditorMode = AnnotationEditorType.NONE
    let presentationModeState = PresentationModeState.NORMAL

    const disableActive = () => {
      const prevActive = this.active
      this.switchTool(CursorTool.SELECT)
      this.prevActive ??= prevActive
    }

    const enableActive = () => {
      const prevActive = this.prevActive

      if (
        prevActive
        && annotationEditorMode === AnnotationEditorType.NONE
        && presentationModeState === PresentationModeState.NORMAL
      ) {
        this.prevActive = undefined
        this.switchTool(prevActive)
      }
    }

    this.on('annotationeditormodechanged', ({ mode }) => {
      annotationEditorMode = mode

      if (mode === AnnotationEditorType.NONE) {
        enableActive()
      } else {
        disableActive()
      }
    })

    this.on('presentationmodechanged', ({ state }) => {
      presentationModeState = state

      if (state === PresentationModeState.NORMAL) {
        enableActive()
      } else if (state === PresentationModeState.FULLSCREEN) {
        disableActive()
      }
    })
  }

  protected destroy() {
    this.handTool?.deactivate()
    this.handTool = undefined
  }

  get activeTool() {
    return this.active
  }

  switchTool(tool: CursorTool) {
    if (this.prevActive) {
      return
    }

    if (tool === this.active) {
      return
    }

    const disableActiveTool = () => {
      switch (this.active) {
        case CursorTool.SELECT:
          break
        case CursorTool.HAND:
          this.handTool?.deactivate()
          break
      }
    }

    switch (tool) {
      case CursorTool.SELECT:
        disableActiveTool()
        break
      case CursorTool.HAND:
        disableActiveTool()
        this.handTool?.activate()
        break
      default:
        console.error(`switchTool: '${tool}' is an unsupported value.`)
        return
    }

    this.active = tool
    this.dispatch('cursortoolchanged', { tool })
  }
}
