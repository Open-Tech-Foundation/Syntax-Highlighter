export const benchStyles = `
.marketing .bench{max-width:72rem;margin:0 auto;padding:0 1.5rem 3.5rem}
.marketing .bench-card{border:1px solid #232c44;border-radius:1rem;background:linear-gradient(180deg,#0d1528,#0a0f1f);padding:2rem 2.25rem;box-shadow:0 30px 70px #00000059}
.marketing .bench-top{display:flex;justify-content:space-between;align-items:flex-end;gap:1.5rem;flex-wrap:wrap}
.marketing .bench-kicker{margin:0 0 .3rem;font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;color:#8b7cf6;font-weight:700}
.marketing .bench-top h2{margin:0;font-size:1.9rem;letter-spacing:-0.02em;color:#f2f5fb}
.marketing .bench-sub{margin:.5rem 0 0;color:#9aa7c2;max-width:34rem}
.marketing .bench-hero-stat{display:flex;flex-direction:column;align-items:flex-end;line-height:1}
.marketing .bench-big{font-size:3.4rem;font-weight:800;letter-spacing:-0.04em;background:linear-gradient(120deg,#b09dff,#8b7cf6);-webkit-background-clip:text;background-clip:text;color:transparent}
.marketing .bench-big-sub{margin-top:.35rem;font-size:.85rem;color:#9aa7c2}
.marketing .bench-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin:1.5rem 0 0}
.marketing .bench-stat{border:1px solid #1b2440;border-radius:.75rem;padding:.9rem 1.1rem;background:#0b112099;display:flex;flex-direction:column;gap:.15rem}
.marketing .bench-stat b{font-size:1.35rem;color:#f2f5fb;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.marketing .bench-stat span{font-size:.78rem;color:#8b99bb}
.marketing .bench-table{width:100%;margin-top:1.5rem;border-collapse:collapse;font-size:.88rem}
.marketing .bench-table th{text-align:left;font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;color:#8b99bb;font-weight:600;padding:.6rem .9rem;border-bottom:1px solid #232c44}
.marketing .bench-table td{padding:.65rem .9rem;border-bottom:1px solid #1b2440;color:#c6d0e4;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.marketing .bench-table tbody tr:last-child td{border-bottom:0}
.marketing .bench-table tr.is-us td{color:#f2f5fb;background:#8b7cf614}
.marketing .bench-table tr.is-us td:first-child{border-left:2px solid #8b7cf6}
.marketing .bench-track{display:block;width:100%;min-width:6rem;height:.7rem}
.marketing .bench-fill{fill:#5b6a89}
.marketing .bench-fill.is-us{fill:#8b7cf6}
.marketing .bench-fill.is-shiki{fill:#f59e0b}
.marketing .bench-fill.is-sugar{fill:#34d399}
.marketing .bench-fill.is-hljs{fill:#ef4444}
.marketing .bench-fill.is-prism{fill:#60a5fa}
.marketing .bench-fill.is-low{fill:#9ca3af}
.marketing .bench-val{font-size:.85rem;font-weight:700;color:#dbe4f5;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;text-align:right}
.marketing .bench-note{margin:1.25rem 0 0;font-size:.78rem;color:#5f7194;max-width:60rem}
:root[data-theme="light"] .marketing .bench-card{border-color:#d5dbe7;background:linear-gradient(180deg,#ffffff,#f3f5f9);box-shadow:0 30px 70px #54617a1c}
:root[data-theme="light"] .marketing .bench-top h2{color:#182033}
:root[data-theme="light"] .marketing .bench-sub{color:#55627a}
:root[data-theme="light"] .marketing .bench-big-sub{color:#68758b}
:root[data-theme="light"] .marketing .bench-stat{border-color:#e2e6ee;background:#ffffff}
:root[data-theme="light"] .marketing .bench-stat b{color:#182033}
:root[data-theme="light"] .marketing .bench-stat span{color:#68758b}
:root[data-theme="light"] .marketing .bench-table th{color:#68758b;border-color:#e2e6ee}
:root[data-theme="light"] .marketing .bench-table td{color:#3e4b63;border-color:#edf0f5}
:root[data-theme="light"] .marketing .bench-table tr.is-us td{color:#182033;background:#8b7cf614}
:root[data-theme="light"] .marketing .bench-val{color:#28334a}
:root[data-theme="light"] .marketing .bench-note{color:#8b96ab}
@media (max-width:56rem){.marketing .bench-card{padding:1.5rem 1.25rem}.marketing .bench-big{font-size:2.6rem}.marketing .bench-stats{grid-template-columns:1fr 1fr}.marketing .bench-table{font-size:.78rem}.marketing .bench-table th:nth-child(4),.marketing .bench-table td:nth-child(4){display:none}}
`;
