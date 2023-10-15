<script lang="ts">
  import CursorFollow from "$lib/components/CursorFollow.svelte";
</script>

<div id="andy-vo-portfolio">
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
</style>