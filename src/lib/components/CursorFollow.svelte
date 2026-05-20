<script lang="ts">
	import { CursorDirections } from '$lib/constants/cursorDirections';
	import { CursorDirection } from '$lib/stores/cursorDirection';
	import { spring, tweened } from 'svelte/motion';

	/*==== motion states ====*/
	const mouseCoords = spring({ x: 0, y: 0 });
	const scale = tweened(1, { duration: 100 });

	/*==== direction detection state ====*/
	let accumulatedDx = 0;
	let accumulatedDy = 0;
	let lastDirection: CursorDirections = CursorDirections.Down;
	let cursorClassName = 'cursor down';
	let resetTimer: number;

	/*==== angle-based direction detection ====*/
	const getDirectionFromAngle = (dx: number, dy: number): CursorDirections | null => {
		// dead zone - ignore micro movements
		const magnitude = Math.sqrt(dx * dx + dy * dy);
		if (magnitude < 3) return null;

		// calculate angle in degrees (0-360)
		const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;

		// map to cardinal directions with 90° wedges
		// right: 315-45°, down: 45-135°, left: 135-225°, up: 225-315°
		if (angle >= 315 || angle < 45) return CursorDirections.Right;
		if (angle >= 45 && angle < 135) return CursorDirections.Down;
		if (angle >= 135 && angle < 225) return CursorDirections.Left;
		return CursorDirections.Up;
	};

	/*==== motion handlers ====*/
	const onMouseMove = (event: MouseEvent) => {
		// always update position for smooth following
		$mouseCoords = { x: event.clientX, y: event.clientY };

		// accumulate movement deltas (native movementX/Y is more accurate!)
		accumulatedDx += event.movementX;
		accumulatedDy += event.movementY;

		// reset accumulator after brief pause to keep it fresh
		clearTimeout(resetTimer);
		resetTimer = setTimeout(() => {
			accumulatedDx = 0;
			accumulatedDy = 0;
		}, 50);

		// detect direction from accumulated movement
		const newDirection = getDirectionFromAngle(accumulatedDx, accumulatedDy);

		if (newDirection && newDirection !== lastDirection) {
			lastDirection = newDirection;
			CursorDirection.set(newDirection);
			cursorClassName = `cursor ${newDirection.toLowerCase()}`;
		}
	};

	const onMouseOver = (event: MouseEvent) => {
		if (event.target instanceof HTMLButtonElement) {
			$scale = 2;
		} else if (event.target instanceof HTMLParagraphElement) {
			$scale = 1.5;
		} else {
			$scale = 1;
		}
	};

	const onMouseOut = () => {
		$scale = 1;
	};
</script>

<svelte:window on:mousemove={onMouseMove} on:mouseover={onMouseOver} on:mouseout={onMouseOut} />

<div class="container">
	<div
		class={cursorClassName}
		style:--x={`${$mouseCoords.x}px`}
		style:--y={`${$mouseCoords.y}px`}
		style:--scale={$scale}
	/>
</div>

<style lang="scss">
	.container {
		position: fixed;
		top: 20;
		left: -20;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.cursor {
		position: absolute;
		top: 0.5rem;
		left: 1rem;

		width: 1rem;
		height: 1rem;
		border-radius: 50%;
		&.left {
			border: 2px solid red;
		}
		&.right {
			border: 2px solid blue;
		}
		&.up {
			border: 2px solid green;
		}
		&.down {
			border: 2px solid yellow;
		}
		border: 2px solid black;

		transform: translate(-50%, -50%) translate(var(--x, 0px), var(--y, 0px)) scale(var(--scale, 1));
	}
</style>
