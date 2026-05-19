export enum LoadingCorner {
  TopLeft = "TopLeft",
  TopRight = "TopRight",
  BottomLeft = "BottomLeft",
  BottomRight = "BottomRight"
}

export const LOADING_TEXT = {
  topLeft: "welcome",
  topRight: "to",
  bottomLeft: "my",
  bottomRight: "corner",
  center: "of the internet"
} as const;

export type LoadingText = typeof LOADING_TEXT;

export const LOADING_HOLD_MS = 2400;
export const LOADING_REVEAL_MS = 1600;
export const TIP_OVERSHOOT = 2.5;
export const FANG_CURVATURE = 0.55;
export const BASE_RUSH = 1.5;

export const ALL_CORNERS: readonly LoadingCorner[] = [
  LoadingCorner.TopLeft,
  LoadingCorner.TopRight,
  LoadingCorner.BottomLeft,
  LoadingCorner.BottomRight
] as const;
