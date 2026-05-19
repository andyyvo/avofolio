export const CLOTH_RESOLUTION = 46;
export const CLOTH_OVERFLOW = 0.05;
export const CLOTH_DAMPING = 0.988;
export const CLOTH_CONSTRAINT_ITERATIONS = 3;
export const CLOTH_SHEAR_STIFFNESS = 0.08;
export const CLOTH_RETURN_SPEED = 0.008;
export const CLOTH_RETURN_BOOST = 0.05;
export const CLOTH_RETURN_FAR = 0.025;
export const CLOTH_SETTLE_THRESHOLD = 0.12;
export const CLOTH_DRAG_FOLLOW = 0.035;

export const CLOTH_Z_DAMPING = 0.995;
export const CLOTH_Z_WAVE_COUPLING = 0.15;
export const CLOTH_Z_RETURN = 0.005;
export const CLOTH_Z_DIP_FACTOR = 0.18;
export const CLOTH_Z_MAX = 40;
export const HOVER_RIPPLE_STRENGTH = 0.28;
export const HOVER_RIPPLE_RADIUS = 90;
export const CLOTH_Z_HIGHLIGHT = 1.4;
export const CLOTH_Z_SHADOW = 0.85;

export const CLOTH_LIGHT_DIR_X = -0.5;
export const CLOTH_LIGHT_DIR_Y = -0.4;
export const CLOTH_LIGHT_DIR_Z = 1.0;
export const CLOTH_LIGHT_INTENSITY = 0.35;
export const CLOTH_AMBIENT_INTENSITY = 1.0;
export const CLOTH_SHININESS = 30;

export const DISMISS_THRESHOLD_FRAC = 0.2;
export const DISMISS_DURATION_MS = 11200;
export const DISMISS_VELOCITY = 1;

export const CLOTH_BG = "#0012FF";
export const CLOTH_FG = "#FAFAFA";

export const CLOTH_FONT_BODY = "'IBM Plex Sans', sans-serif";
export const CLOTH_FONT_PIXEL = "'Pixelify Sans', monospace";

export const CLOTH_COPY = {
  smiley: ":DDD",
  bodyBefore: "Welcome to my corner of the ",
  bodyPixel: "internet",
  bodyAfterFirst: ".",
  bodyAfterRest: "Find your way out of here, and then I'll introduce myself.",
  progressSuffix: "% complete",
  footer: "For more information about Andy Vo, you will have to select a corner."
} as const;

export type ClothCopy = typeof CLOTH_COPY;
