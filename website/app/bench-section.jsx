// Benchmarks: end-to-end source→HTML throughput, static numbers from
// `tsr bench` (website/app/bench-data.js). Esrun-style results table,
// fastest-first. Static markup — SSR-safe.
import { BENCH } from "./bench-data.js";
import { benchStyles } from "./bench-styles.js";

export default function BenchSection() {
  const ours = BENCH.engines.ours;
  const shiki = BENCH.engines.shiki;
  const sugar = BENCH.engines["sugar-high"];
  const hljs = BENCH.engines.hljs;
  const prism = BENCH.engines.prism;
  const low = BENCH.engines.lowlight;
  const rate = ours.ktps >= 1000 ? `${(ours.ktps / 1000).toFixed(2)}M` : `${ours.ktps}K`;
  const rows = [
    {
      name: "sugar-high",
      ms: sugar.ms,
      mbs: sugar.mbs,
      files: sugar.files,
      cls: "",
      bar: "is-sugar",
    },
    {
      name: "This library",
      ms: ours.ms,
      mbs: ours.mbs,
      files: ours.files,
      cls: "is-us",
      bar: "is-us",
    },
    { name: "Prism", ms: prism.ms, mbs: prism.mbs, files: prism.files, cls: "", bar: "is-prism" },
    {
      name: "highlight.js",
      ms: hljs.ms,
      mbs: hljs.mbs,
      files: hljs.files,
      cls: "",
      bar: "is-hljs",
    },
    { name: "lowlight", ms: low.ms, mbs: low.mbs, files: low.files, cls: "", bar: "is-low" },
    { name: "Shiki", ms: shiki.ms, mbs: shiki.mbs, files: shiki.files, cls: "", bar: "is-shiki" },
  ].sort((a, b) => a.ms - b.ms);
  const minMs = Math.min(sugar.ms, ours.ms, prism.ms, hljs.ms, low.ms, shiki.ms);
  const maxMs = Math.max(sugar.ms, ours.ms, prism.ms, hljs.ms, low.ms, shiki.ms);
  const logSpan = Math.log10(maxMs) - Math.log10(minMs);

  return (
    <section class="bench" aria-label="Benchmarks">
      <style>{benchStyles}</style>
      <div class="bench-card">
        <div class="bench-top">
          <div>
            <p class="bench-kicker">Benchmarks</p>
            <h2>Fast by design</h2>
            <p class="bench-sub">
              End-to-end highlighting (tokenize + HTML) over {BENCH.corpus.files} real-world
              samples.
            </p>
          </div>
          <div class="bench-hero-stat">
            <span class="bench-big">{Math.round(BENCH.speedupVsShiki)}×</span>
            <span class="bench-big-sub">faster than Shiki</span>
          </div>
        </div>
        <div class="bench-stats">
          <div class="bench-stat">
            <b>{rate}</b>
            <span>tokens / sec</span>
          </div>
          <div class="bench-stat">
            <b>{ours.ms}ms</b>
            <span>total, {ours.files} files</span>
          </div>
          <div class="bench-stat">
            <b>{ours.mbs}</b>
            <span>MB / sec</span>
          </div>
        </div>
        <table class="bench-table">
          <thead>
            <tr>
              <th>Engine</th>
              <th>Time (lower ↓)</th>
              <th>Relative</th>
              <th>Throughput</th>
              <th>Files</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} class={r.cls}>
                <td>{r.name}</td>
                <td>{r.ms}ms</td>
                <td>
                  <svg
                    class="bench-track"
                    viewBox="0 0 100 10"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <rect
                      class={`bench-fill ${r.bar}`}
                      x="0"
                      y="0"
                      width={4 + (96 * (Math.log10(r.ms) - Math.log10(minMs))) / logSpan}
                      height="10"
                      rx="5"
                    />
                  </svg>
                </td>
                <td>{r.mbs} MB/s</td>
                <td>{r.files}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p class="bench-note">
          Each engine ran the files it supports; pairs share identical file sets. Median of 8 runs
          on the esdev runtime, {BENCH.generated}. starry-night is unreachable from this registry.
        </p>
      </div>
    </section>
  );
}
