<script lang="ts">
  import { onDestroy, onMount, createEventDispatcher } from "svelte";
  import { tweened } from "svelte/motion";
  import { cubicInOut } from "svelte/easing";
  import {
    LOADING_HOLD_MS,
    LOADING_REVEAL_MS,
    LOADING_TEXT,
    LoadingCorner,
    type LoadingText
  } from "$lib/constants/loadingScreen";
  import { buildTearPath, buildWordPull, resolveCorner } from "$lib/utils/loadingScreen";
  import { isLoading } from "$lib/stores/loadingScreen";

  export let pullFrom: LoadingCorner | "random" = "random";
  export let holdMs: number = LOADING_HOLD_MS;
  export let revealMs: number = LOADING_REVEAL_MS;
  export let text: LoadingText = LOADING_TEXT;

  const dispatch = createEventDispatcher<{ complete: void }>();

  const resolvedCorner = resolveCorner(pullFrom);
  const ariaLabel = `${text.topLeft} ${text.topRight} ${text.bottomLeft} ${text.bottomRight} ${text.center}`;
  const clipId = `tear-clip-${Math.random().toString(36).slice(2, 9)}`;

  const progress = tweened(0, { duration: revealMs, easing: cubicInOut });

  let viewportW = 0;
  let viewportH = 0;

  $: pathD = buildTearPath($progress, viewportW, viewportH, resolvedCorner);
  $: pullTopLeft = buildWordPull("topLeft", resolvedCorner, $progress, viewportW, viewportH);
  $: pullTopRight = buildWordPull("topRight", resolvedCorner, $progress, viewportW, viewportH);
  $: pullBottomLeft = buildWordPull("bottomLeft", resolvedCorner, $progress, viewportW, viewportH);
  $: pullBottomRight = buildWordPull("bottomRight", resolvedCorner, $progress, viewportW, viewportH);
  $: pullCenter = buildWordPull("center", resolvedCorner, $progress, viewportW, viewportH);

  let removed = false;
  let holdTimer: ReturnType<typeof setTimeout>;
  let revealTimer: ReturnType<typeof setTimeout>;

  const measure = () => {
    viewportW = window.innerWidth;
    viewportH = window.innerHeight;
  };

  onMount(() => {
    measure();
    window.addEventListener("resize", measure);

    isLoading.set(true);
    holdTimer = setTimeout(() => {
      progress.set(1);
      revealTimer = setTimeout(() => {
        removed = true;
        isLoading.set(false);
        dispatch("complete");
      }, revealMs);
    }, holdMs);
  });

  onDestroy(() => {
    clearTimeout(holdTimer);
    clearTimeout(revealTimer);
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", measure);
    }
  });
</script>

<svelte:body class:loading-active={!removed} />

{#if !removed}
  <svg class="clip-defs" width="0" height="0" aria-hidden="true">
    <defs>
      <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
        <path d={pathD} />
      </clipPath>
    </defs>
  </svg>

  <div
    class="loading-screen"
    style:clip-path={`url(#${clipId})`}
    style:-webkit-clip-path={`url(#${clipId})`}
    aria-label={ariaLabel}
    role="img"
  >
    <span class="word top-left"><span class="word-pull" style:transform={pullTopLeft}>{text.topLeft}</span></span>
    <span class="word top-right"><span class="word-pull" style:transform={pullTopRight}>{text.topRight}</span></span>
    <span class="word bottom-left"><span class="word-pull" style:transform={pullBottomLeft}>{text.bottomLeft}</span></span>
    <span class="word bottom-right"><span class="word-pull" style:transform={pullBottomRight}>{text.bottomRight}</span></span>
    <span class="word center"><span class="word-pull" style:transform={pullCenter}>{text.center}</span></span>
  </div>
{/if}

<style lang="scss">
  @import "../styles/global.scss";

  $padding: clamp(1.25rem, 3vw, 3rem);
  $corner-size: clamp(2.5rem, 8vw, 6.5rem);
  $center-size: clamp(1.25rem, 3.5vw, 2.5rem);
  $z-overlay: 9999;
  $stagger-step: 90ms;
  $stagger-base: 80ms;
  $drop-distance: 14px;

  :global(body.loading-active) {
    overflow: hidden;
  }

  .clip-defs {
    position: absolute;
    width: 0;
    height: 0;
    pointer-events: none;
  }

  .loading-screen {
    position: fixed;
    inset: 0;
    background-color: $cobalt;
    color: $snow;
    z-index: $z-overlay;
    overflow: hidden;
  }

  .word-pull {
    display: inline-block;
    transform-origin: center;
    will-change: transform;
  }

  .word {
    position: absolute;
    font-family: sans-serif;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1;
    white-space: nowrap;
    opacity: 0;
    animation: drop-in 620ms ease-out forwards;
    pointer-events: none;

    &.top-left {
      top: $padding;
      left: $padding;
      font-size: $corner-size;
      animation-delay: $stagger-base;
    }
    &.top-right {
      top: $padding;
      right: $padding;
      font-size: $corner-size;
      animation-delay: $stagger-base + $stagger-step;
    }
    &.bottom-left {
      bottom: $padding;
      left: $padding;
      font-size: $corner-size;
      animation-delay: $stagger-base + $stagger-step * 2;
    }
    &.bottom-right {
      bottom: $padding;
      right: $padding;
      font-size: $corner-size;
      animation-delay: $stagger-base + $stagger-step * 3;
    }
    &.center {
      top: 50%;
      left: 50%;
      font-size: $center-size;
      font-weight: 500;
      letter-spacing: 0.04em;
      animation-name: drop-in-center;
      animation-delay: $stagger-base + $stagger-step * 4;
    }
  }

  @keyframes drop-in {
    from {
      opacity: 0;
      transform: translateY(-#{$drop-distance});
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes drop-in-center {
    from {
      opacity: 0;
      transform: translate(-50%, calc(-50% - #{$drop-distance}));
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .loading-screen {
      transition: opacity 240ms ease-out;
      clip-path: none !important;
      -webkit-clip-path: none !important;
    }
    .word {
      animation: none;
      opacity: 1;
    }
    .word.center {
      transform: translate(-50%, -50%);
    }
  }
</style>
