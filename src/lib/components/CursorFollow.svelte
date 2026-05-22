<script lang="ts">
	import { CursorDirections } from '$lib/constants/cursorDirections';
	import { CursorDirection } from '$lib/stores/cursorDirection';
	import {
		DIRECTION_DEADZONE_PX,
		DIRECTION_RESET_MS,
		HOVER_SCALE_BUTTON,
		HOVER_SCALE_PARAGRAPH,
		SHADOW_HEIGHT,
		SHADOW_OFFSET_Y,
		SHADOW_OPACITY,
		SHADOW_WIDTH,
		SPRITE_FRAME_MS,
		SPRITE_H,
		SPRITE_OFFSET_X,
		SPRITE_OFFSET_Y,
		SPRITE_PATHS,
		SPRITE_W
	} from '$lib/constants/cursorFollow';
	import { onDestroy, onMount } from 'svelte';
	import { spring, tweened } from 'svelte/motion';

	const mouseCoords = spring({ x: 0, y: 0 });
	const scale = tweened(1, { duration: 100 });

	let accumulatedDx = 0;
	let accumulatedDy = 0;
	let lastDirection: CursorDirections = CursorDirections.Down;
	let resetTimer: ReturnType<typeof setTimeout>;

	let frameIndex = 0;
	let frameTimer: ReturnType<typeof setInterval>;

	onMount(() => {
		frameTimer = setInterval(() => {
			frameIndex = frameIndex === 0 ? 1 : 0;
		}, SPRITE_FRAME_MS);
	});

	onDestroy(() => {
		clearInterval(frameTimer);
	});

	$: spriteSrc = SPRITE_PATHS[lastDirection][frameIndex];

	const getDirectionFromAngle = (dx: number, dy: number): CursorDirections | null => {
		const magnitude = Math.sqrt(dx * dx + dy * dy);
		if (magnitude < DIRECTION_DEADZONE_PX) return null;

		const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;

		if (angle >= 315 || angle < 45) return CursorDirections.Right;
		if (angle >= 45 && angle < 135) return CursorDirections.Down;
		if (angle >= 135 && angle < 225) return CursorDirections.Left;
		return CursorDirections.Up;
	};

	const onMouseMove = (event: MouseEvent) => {
		$mouseCoords = { x: event.clientX, y: event.clientY };

		accumulatedDx += event.movementX;
		accumulatedDy += event.movementY;

		clearTimeout(resetTimer);
		resetTimer = setTimeout(() => {
			accumulatedDx = 0;
			accumulatedDy = 0;
		}, DIRECTION_RESET_MS);

		const newDirection = getDirectionFromAngle(accumulatedDx, accumulatedDy);

		if (newDirection && newDirection !== lastDirection) {
			lastDirection = newDirection;
			CursorDirection.set(newDirection);
		}
	};

	const onMouseOver = (event: MouseEvent) => {
		if (event.target instanceof HTMLButtonElement) {
			$scale = HOVER_SCALE_BUTTON;
		} else if (event.target instanceof HTMLParagraphElement) {
			$scale = HOVER_SCALE_PARAGRAPH;
		} else {
			$scale = 1;
		}
	};

	const onMouseOut = () => {
		$scale = 1;
	};
</script>

<svelte:window on:mousemove={onMouseMove} on:mouseover={onMouseOver} on:mouseout={onMouseOut} />

<div class="container" aria-hidden="true">
	<div
		class="anchor"
		style:--x={`${$mouseCoords.x + SPRITE_OFFSET_X}px`}
		style:--y={`${$mouseCoords.y + SPRITE_OFFSET_Y}px`}
		style:--scale={$scale}
		style:--sprite-w={`${SPRITE_W}px`}
		style:--sprite-h={`${SPRITE_H}px`}
		style:--shadow-w={`${SHADOW_WIDTH}px`}
		style:--shadow-h={`${SHADOW_HEIGHT}px`}
		style:--shadow-y={`${SHADOW_OFFSET_Y}px`}
		style:--shadow-opacity={SHADOW_OPACITY}
	>
		<div class="shadow" />
		<img class="sprite" src={spriteSrc} alt="" draggable="false" />
	</div>
</div>

<style lang="scss">
	.container {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 10000;
	}

	.anchor {
		position: absolute;
		top: 0;
		left: 0;
		width: 0;
		height: 0;
		transform: translate(var(--x, 0px), var(--y, 0px)) scale(var(--scale, 1));
		transform-origin: 0 0;
		will-change: transform;
	}

	.shadow {
		position: absolute;
		left: 50%;
		top: 50%;
		width: var(--shadow-w);
		height: var(--shadow-h);
		margin-left: calc(var(--shadow-w) / -2);
		margin-top: var(--shadow-y);
		background: #000;
		opacity: var(--shadow-opacity);
		border-radius: 50%;
		filter: blur(1px);
	}

	.sprite {
		position: absolute;
		left: 50%;
		top: 50%;
		width: var(--sprite-w);
		height: var(--sprite-h);
		margin-left: calc(var(--sprite-w) / -2);
		margin-top: calc(var(--sprite-h) / -2);
		image-rendering: pixelated;
		user-select: none;
	}
</style>
