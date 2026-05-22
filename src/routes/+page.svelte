<script lang="ts">
	const SMILEY = ':DDD';
</script>

<section class="hero">
	<h1 class="smiley">{SMILEY}</h1>
</section>

<style lang="scss">
	@import '../lib/styles/global.scss';

	.hero {
		position: relative;
		min-height: 100vh;
		width: 100%;
		background-color: $white;
		overflow: hidden;
	}

	.smiley {
		position: absolute;
		top: calc(42vh - 17.16vmin);
		left: calc(max(24px, 4.5vw) - 1.98vmin);
		margin: 0;
		font-family: 'IBM Plex Sans', sans-serif;
		font-weight: 200;
		font-size: 22vmin;
		line-height: 1;
		letter-spacing: normal;
		color: $ink;
		user-select: none;
	}
</style>
