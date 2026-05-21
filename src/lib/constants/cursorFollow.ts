import { CursorDirections } from '$lib/constants/cursorDirections';

export const SPRITE_NATIVE_W = 32;
export const SPRITE_NATIVE_H = 40;
export const SPRITE_SCALE = 0.8;
export const SPRITE_W = SPRITE_NATIVE_W * SPRITE_SCALE;
export const SPRITE_H = SPRITE_NATIVE_H * SPRITE_SCALE;
export const SPRITE_OFFSET_X = 24;
export const SPRITE_OFFSET_Y = 28;
export const SPRITE_FRAME_MS = 260;
export const SHADOW_WIDTH = SPRITE_W * 0.7;
export const SHADOW_HEIGHT = SPRITE_W * 0.18;
export const SHADOW_OPACITY = 0.35;
export const SHADOW_OFFSET_Y = SPRITE_H * 0.45;
export const HOVER_SCALE_BUTTON = 1.4;
export const HOVER_SCALE_PARAGRAPH = 1.15;
export const DIRECTION_DEADZONE_PX = 3;
export const DIRECTION_RESET_MS = 50;

export const SPRITE_PATHS: Record<CursorDirections, [string, string]> = {
	[CursorDirections.Up]: [
		'/images/cursor-follow/victini/victini-up.png',
		'/images/cursor-follow/victini/victini-up-2.png'
	],
	[CursorDirections.Down]: [
		'/images/cursor-follow/victini/victini-down.png',
		'/images/cursor-follow/victini/victini-down-2.png'
	],
	[CursorDirections.Left]: [
		'/images/cursor-follow/victini/victini-left.png',
		'/images/cursor-follow/victini/victini-left-2.png'
	],
	[CursorDirections.Right]: [
		'/images/cursor-follow/victini/victini-right.png',
		'/images/cursor-follow/victini/victini-right-2.png'
	]
};
