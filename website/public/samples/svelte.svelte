<!-- Showcase: Svelte — runes, snippets, and await blocks. -->
<script lang="ts">
  import { onMount } from "svelte";

  let { language = "typescript" }: { language?: string } = $props();
  let source = $state("");
  let tokens = $state<Token[]>([]);
  let error = $state<string | null>(null);

  let significant = $derived(tokens.filter((t) => t.type !== "whitespace"));
  let byKind = $derived.by(() => {
    const map = new Map<string, number>();
    for (const t of significant) map.set(t.type, (map.get(t.type) ?? 0) + 1);
    return map;
  });

  async function highlight() {
    error = null;
    try {
      const hl = await createHighlighter({ language });
      tokens = hl.highlight(source);
    } catch (e) {
      error = e instanceof Error ? e.message : "failed";
    }
  }

  onMount(() => {
    source = 'const answer = 40 + 2;';
  });

  $effect(() => {
    if (source) void highlight();
  });
</script>

{#snippet stat(kind: string, n: number)}
  <li><b>{kind}</b>: {n}</li>
{/snippet}

<main>
  <h1>Playground</h1>
  {#if error}
    <p class="error">{error}</p>
  {:else if tokens.length === 0}
    <p>Type something to begin.</p>
  {/if}
  <textarea bind:value={source} rows="6"></textarea>
  <button onclick={highlight}>Highlight</button>
  {#await highlight() then _}
    <p>{tokens.length} tokens</p>
  {:catch e}
    <p>{e.message}</p>
  {/await}
  <ul>
    {#each [...byKind] as [kind, n]}
      {@render stat(kind, n)}
    {/each}
  </ul>
  {@html "<!-- raw html -->"}
</main>

<style>
  main {
    display: grid;
    gap: 0.5rem;
  }
  .error {
    color: red;
  }
</style>
