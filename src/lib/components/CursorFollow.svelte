<script lang="ts">
	import { CursorDirections } from "$lib/constants/cursorDirections";
	import { CursorDirection } from "$lib/stores/cursorDirection";
	import { spring, tweened } from "svelte/motion"
  
  /*==== debounce timer cursor ====*/
  let mouseUpdateDelay: number
  let mouseSaveDelay: number

  /*==== motion states ====*/
	const mouseCoords = spring({ x: 0, y: 0 })
	const scale = tweened(1, { duration: 100 })
  let lastX: number = 0
  let lastY: number = 0
  let cursorClassName = "cursor"

  /*==== motion handlers ====*/
	const onMouseMove = (event: MouseEvent) => {
    // mouse position
    $mouseCoords = { x: event.x, y: event.y }
    
    // debouncing to smooth direction assignment
    clearTimeout(mouseUpdateDelay)
    mouseUpdateDelay = setTimeout(() => {

      // delaying last saved coords to give mouse movement more effect
      clearTimeout(mouseSaveDelay)
      mouseSaveDelay = setTimeout(() => {
        lastX = event.clientX
        lastY = event.clientY
        // console.log('>>> x', event.clientX)
        // console.log('>>> y', event.clientY)
      }, 120)
  
      // calc distance traveled
      let dx: number = event.clientX - lastX;
      let dy: number = event.clientY - lastY;
  
      // console.log('>>> dx', dx)
      // console.log('>>> dy', dy)
  
      if(Math.abs(dx) > Math.abs(dy)) { // lateral
        CursorDirection.set((dx > 0) ? CursorDirections.Right : CursorDirections.Left)
        cursorClassName = (dx > 0) ? "cursor right" : "cursor left"
      } else { // vertical
        CursorDirection.set((dy > 0) ? CursorDirections.Down : CursorDirections.Up)
        cursorClassName = (dy > 0) ? "cursor down" : "cursor up"
      }
      // CursorDirection.subscribe(value => {
      //   console.log('>>> direction', value)
      // })
    }, 1)
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
</script>

<svelte:window 
	on:mousemove={onMouseMove}
	on:mouseover={onMouseOver}
	on:mouseout={onMouseOut}
/>

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