<script lang="ts">
	const SMILEY = ':DDD';
	const NAME = 'Andy Vo.';
	const TAGLINE = 'The Synchronistic.';
	const BIO =
		'Equal parts design engineer, professional amateur runner, and armchair metaphysician. Often unsolicitedly sharing design philosophies or cognitive personality theories. Tends to know which way to walk before he knows why.';
</script>

<section class="hero">
	<div class="stack">
		<h1 class="smiley">{SMILEY}</h1>
		<p class="name">{NAME} <span class="tagline">{TAGLINE}</span></p>
		<p class="bio">{BIO}</p>
	</div>
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

	.stack {
		position: absolute;
		top: calc(42vh - 24.96vmin);
		left: max(24px, 4.5vw);
		right: max(24px, 4.5vw);
		color: $ink;
	}

	.smiley {
		margin: 0 0 0 -2.88vmin;
		font-family: 'IBM Plex Sans', sans-serif;
		font-weight: 200;
		font-size: 32vmin;
		line-height: 1;
		letter-spacing: normal;
		overflow-wrap: anywhere;
		word-break: break-word;
	}

	.name {
		margin: 1.6vmin 0 0;
		font-family: 'Fraunces', serif;
		font-weight: 400;
		font-size: max(20px, 5.2vmin);
		line-height: 1.1;
		letter-spacing: -0.01em;

		.tagline {
			font-style: italic;
			color: $blue;
		}
	}

	.bio {
		margin: 2vmin 0 0;
		max-width: 60ch;
		font-family: 'IBM Plex Sans', sans-serif;
		font-weight: 300;
		font-size: max(14px, 1.9vmin);
		line-height: 1.5;
		color: $charcoal;
	}
</style>
