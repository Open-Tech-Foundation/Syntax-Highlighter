/**
 * The words the page is made of, and the sample source the playground loads.
 *
 * Everything here touches no DOM, so `esdev test` can run it — there is no DOM
 * in the runtime.
 */

/** One entry in the row of links at the foot of the page. */
export type Link = {
  label: string;
  href: string;
};

export const LEDE =
  "Playground for @opentf/syntax-highlighter — edit code, switch languages and themes, inspect the tokens.";

export const LINKS: readonly Link[] = [
  { label: "Docs", href: "https://github.com/Open-Tech-Foundation/Syntax-Highlighter" },
  { label: "ES Runtime", href: "https://esrun.opentechf.org" },
  { label: "Open Tech Foundation", href: "https://opentechf.org" },
];

/** The line telling whoever scaffolded this where to start. */
export function editHint(file: string): string {
  return `Edit ${file} and save.`;
}

/** One named snippet the sample picker can load into the editor. */
export type Sample = {
  name: string;
  language: string;
  source: string;
};

/** Manifest entry from samples/manifest.json */
type SampleManifestEntry = {
  name: string;
  language: string;
  file: string;
};

const SAMPLES_BASE = "./samples";

let samplesCache: Sample[] | null = null;

/**
 * Load samples from the samples/ folder via manifest.json.
 * Returns cached samples on subsequent calls.
 */
export async function loadSamples(): Promise<Sample[]> {
  if (samplesCache) return samplesCache;

  try {
    const manifestResp = await fetch(`${SAMPLES_BASE}/manifest.json`);
    if (!manifestResp.ok) throw new Error(`Failed to load manifest: ${manifestResp.status}`);
    const manifest = (await manifestResp.json()) as SampleManifestEntry[];

    const samples: Sample[] = [];
    for (const entry of manifest) {
      try {
        const fileResp = await fetch(`${SAMPLES_BASE}/${entry.file}`);
        if (!fileResp.ok) {
          console.warn(`Failed to load sample ${entry.file}: ${fileResp.status}`);
          continue;
        }
        const source = await fileResp.text();
        samples.push({
          name: entry.name,
          language: entry.language,
          source,
        });
      } catch (err) {
        console.warn(`Error loading sample ${entry.file}:`, err);
      }
    }

    samplesCache = samples;
    return samples;
  } catch (err) {
    console.error("Failed to load samples manifest:", err);
    return [];
  }
}

/**
 * Synchronous fallback for initial render — returns empty array.
 * Actual samples are loaded asynchronously via loadSamples().
 */
export const SAMPLES: readonly Sample[] = [];

/** A one-line status message. */
export function statusMessage(kind: "ok" | "error", text: string): string {
  return kind === "ok" ? text : `error: ${text}`;
}
