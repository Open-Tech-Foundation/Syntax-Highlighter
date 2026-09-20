<!-- Showcase: Vue — single-file component with script setup. -->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import TokenList from "./TokenList.vue";

interface Props {
  language?: string;
  theme?: string;
}

const props = withDefaults(defineProps<Props>(), {
  language: "typescript",
  theme: "default",
});

const emit = defineEmits<{
  (e: "tokens", count: number): void;
  (e: "error", message: string): void;
}>();

const source = defineModel<string>("source", { default: "" });
const tokens = ref<Token[]>([]);
const loading = ref(false);

const counts = computed(() => {
  const map = new Map<string, number>();
  for (const t of tokens.value) map.set(t.type, (map.get(t.type) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
});

async function highlight() {
  loading.value = true;
  try {
    const hl = await createHighlighter({ language: props.language });
    tokens.value = hl.highlight(source.value);
    emit("tokens", tokens.value.length);
  } catch (err) {
    emit("error", err instanceof Error ? err.message : String(err));
  } finally {
    loading.value = false;
  }
}

watch(() => props.language, highlight);
onMounted(highlight);
defineExpose({ highlight });
</script>

<template>
  <section class="playground" :data-theme="theme">
    <header>
      <h2>Playground <slot name="badge" /></h2>
      <button :disabled="loading" @click="highlight">
        {{ loading ? "Working…" : "Highlight" }}
      </button>
    </header>
    <textarea v-model="source" rows="8" spellcheck="false" />
    <TokenList :tokens="tokens" v-if="tokens.length" />
    <p v-else class="empty">Nothing highlighted yet.</p>
    <ul>
      <li v-for="[kind, n] in counts" :key="kind">{{ kind }}: {{ n }}</li>
    </ul>
  </section>
</template>

<style scoped>
.playground {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
}
.empty {
  color: gray;
}
</style>
