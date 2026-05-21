<script lang="ts">
	import ClothLoadingScreen from '$lib/components/ClothLoadingScreen.svelte';
	import CursorFollow from '$lib/components/CursorFollow.svelte';
	import { clothReady, isLoading } from '$lib/stores/loadingScreen';
</script>

<div id="andy-vo-portfolio">
	{#if $isLoading && !$clothReady}
		<div class="boot-curtain" aria-hidden="true" />
	{/if}
	<ClothLoadingScreen />
	<CursorFollow />
	<slot class="the-andy-vo-app" />
</div>

<style lang="scss">
	@import '../lib/styles/global.scss';

	/*==== GLOBALS ====*/
	:global(*, *::after, *::before) {
		box-sizing: border-box;
		text-rendering: optimizeLegibility;
		font-kerning: auto;
	}

	:global(html) {
		font-family: sans-serif;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		// background-color: $snow;
	}

	#andy-vo-portfolio {
		width: 100%;
		height: auto;
	}

	.boot-curtain {
		position: fixed;
		inset: 0;
		background-color: $cobalt;
		z-index: 9998;
		pointer-events: none;
	}
</style>
