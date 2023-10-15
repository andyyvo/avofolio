import adapter from '@sveltejs/adapter-auto';
import preprocess from 'svelte-preprocess';

/** 
 * https://github.com/sveltejs/svelte-preprocess/blob/main/docs/usage.md
 * This will add autocompletion if you're working with SvelteKit
 * 
 * @type {import('@sveltejs/kit').Config} 
 */
const config = {
  preprocess: preprocess({
    // ...svelte-preprocess options
		scss: { includePaths: ['./src/scss'] }
  }),
  // ...other svelte options
	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		adapter: adapter()
	}
};


export default config;
