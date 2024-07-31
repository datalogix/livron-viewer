export enum TextLayerMode {
  DISABLE,
  ENABLE,
  ENABLE_PERMISSIONS,
}

export enum RenderingStates {
  INITIAL,
  RUNNING,
  PAUSED,
  FINISHED,
}

export enum ScrollMode {
  UNKNOWN,
  VERTICAL,
  HORIZONTAL,
  WRAPPED,
  PAGE,
}

export enum SpreadMode {
  UNKNOWN,
  NONE,
  ODD,
  EVEN,
}

export enum PresentationModeState {
  UNKNOWN,
  NORMAL,
  CHANGING,
  FULLSCREEN,
}

export enum FindState {
  FOUND,
  NOT_FOUND,
  WRAPPED,
  PENDING,
}