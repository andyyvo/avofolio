<script lang="ts">
	import { CursorDirections } from "$lib/constants/cursorDirections";
	import { CursorDirection } from "$lib/stores/cursorDirection";
	import { spring, tweened } from "svelte/motion"

  /*==== motion states ====*/
	const mouseCoords = spring({ x: 0, y: 0 })
	const scale = tweened(1, { duration: 100 })
  let lastX: number = 0
  let lastY: number = 0

  /*==== motion handlers ====*/
  const onMouseDown = (event: MouseEvent) => {
    lastX = event.clientX
    lastY = event.clientY
  }

	const onMouseMove = (event: MouseEvent) => {
		$mouseCoords = { x: event.x, y: event.y }
    
    console.log('>>> x', event.clientX)
    console.log('>>> y', event.clientY)

    // if (event.movementX > event.movementY) {
    //   if (event.movementX > 0) { // positive x
    //     CursorDirection.set(CursorDirections.Right)
    //   } else if (event.movementX < 0) { // negative x
    //     CursorDirection.set(CursorDirections.Left)
    //   }
    // } else if (event.movementY > event.movementX) {
    //   if (event.movementY > 0) {
    //     CursorDirection.set(CursorDirections.Up)
    //   } else if (event.movementY < 0) {
    //     CursorDirection.set(CursorDirections.Down)
    //   }
    // }
    // CursorDirection.subscribe(value => {
    //   console.log(value)
    // })

    let dx: number = event.clientX - lastX;
    let dy: number = event.clientY - lastY;
    if(Math.abs(dx) > Math.abs(dy))
      CursorDirection.set((dx > 0) ? CursorDirections.Right : CursorDirections.Left);
    else
      CursorDirection.set((dy > 0) ? CursorDirections.Down : CursorDirections.Up);

    CursorDirection.subscribe(value => {
      // console.log(value)
    })
	}

	const onMouseOver = (event: MouseEvent) => {
		if (event.target instanceof HTMLButtonElement) {
			$scale = 2
		} else if (event.target instanceof HTMLParagraphElement) {
			$scale = 1.5
		} else {
			$scale = 1
		}
	}

	const onMouseOut = () => {
		$scale = 1
	}

  // const cursorClass: string = () => {
  //   if (CursorDirection === Cur)
  // }
</script>

<svelte:window 
  on:mousedown={onMouseDown}
	on:mousemove={onMouseMove} 
	on:mouseover={onMouseOver}
	on:mouseout={onMouseOut}
/>

<div class="container">
	<div 
		class="cursor"
		style:--x={`${$mouseCoords.x}px`}
		style:--y={`${$mouseCoords.y}px`}
		style:--scale={$scale}
	/>
</div>

<style>
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
		border: 2px solid red;
		
		transform: translate(-50%, -50%) translate(var(--x, 0px), var(--y, 0px)) scale(var(--scale, 1));
	}
</style>