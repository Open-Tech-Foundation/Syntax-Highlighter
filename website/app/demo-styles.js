export const demoStyles = `
.marketing .demo{max-width:72rem;margin:0 auto;padding:2.75rem 1.5rem 3.5rem}
.marketing .demo-head h2{font-size:1.75rem;letter-spacing:-0.02em;margin:0 0 .35rem}
.marketing .demo-head p{margin:0 0 1.25rem;color:#9aa7c2}
.marketing .demo-grid{display:grid;grid-template-columns:15rem 1fr;gap:1rem;align-items:stretch}
.marketing .demo-side{display:flex;flex-direction:column;min-height:0;border:1px solid #232c44;border-radius:.9rem;background:#0b1120;overflow:hidden}
.marketing .demo-search{margin:.75rem;padding:.5rem .7rem;border-radius:.55rem;border:1px solid #2a3552;background:#0e1526;color:#dbe4f5;font-size:.85rem;outline:none}
.marketing .demo-search::placeholder{color:#5b6a89}
.marketing .demo-langs{overflow-y:auto;max-height:26rem;padding:0 .5rem .75rem;display:flex;flex-direction:column;gap:2px}
.marketing .demo-lang{text-align:left;padding:.35rem .6rem;border:0;border-radius:.45rem;background:transparent;color:#9aa7c2;font-size:.85rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;cursor:pointer}
.marketing .demo-lang:hover{background:#141d33;color:#dbe4f5}
.marketing .demo-lang.is-active{background:#1c2947;color:#fff}
.marketing .demo-main{display:flex;flex-direction:column;min-width:0;border:1px solid #232c44;border-radius:.9rem;background:#0b1120;overflow:hidden}
.marketing .demo-tabbar{display:flex;justify-content:space-between;align-items:center;gap:.75rem;padding:.55rem .9rem;border-bottom:1px solid #1b2440;color:#8b99bb;font-size:.8rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.marketing .demo-tabright{display:flex;align-items:center;gap:.75rem}
.marketing .demo-theme{background:#0e1526;border:1px solid #2a3552;color:#dbe4f5;border-radius:.5rem;padding:.3rem .5rem;font-size:.8rem;font-family:inherit;outline:none;cursor:pointer}
.marketing .demo-count{color:#5f7194}
.marketing .demo-editor{position:relative;flex:1;min-height:22rem;display:flex;align-items:stretch}
.marketing .demo-gutter{flex:0 0 auto;min-width:2.75rem;max-width:3.5rem;margin:0;padding:1rem .5rem 1rem 1rem;max-height:26rem;overflow:hidden;text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.83rem;line-height:1.65;white-space:pre;color:#46587e;user-select:none}
.marketing .demo-codewrap{position:relative;flex:1;min-width:0;display:flex}
.marketing .demo-code{margin:0;padding:1rem 1.1rem;flex:1;min-height:22rem;max-height:26rem;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.83rem;line-height:1.65;tab-size:2;white-space:pre;background:transparent}
.marketing .demo-input{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:1rem 1.1rem;border:0;resize:none;overflow:auto;scrollbar-width:none;background:transparent;color:transparent;caret-color:#7dd3fc;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.83rem;line-height:1.65;tab-size:2;white-space:pre;outline:none}
.marketing .demo-input::-webkit-scrollbar{display:none}
.marketing .demo-input::selection{background:#26406b}
:root[data-theme="light"] .marketing .demo-head p{color:#55627a}
:root[data-theme="light"] .marketing .demo-side,:root[data-theme="light"] .marketing .demo-main{border-color:#d5dbe7;background:#fff}
:root[data-theme="light"] .marketing .demo-search{border-color:#d5dbe7;background:#f3f5f9;color:#28334a}
:root[data-theme="light"] .marketing .demo-search::placeholder{color:#8b96ab}
:root[data-theme="light"] .marketing .demo-lang{color:#5b6a89}
:root[data-theme="light"] .marketing .demo-lang:hover{background:#eef1f6;color:#28334a}
:root[data-theme="light"] .marketing .demo-lang.is-active{background:#e2e8f5;color:#182033}
:root[data-theme="light"] .marketing .demo-tabbar{border-color:#e2e6ee;color:#69758c}
:root[data-theme="light"] .marketing .demo-theme{background:#f3f5f9;border-color:#d5dbe7;color:#28334a}
:root[data-theme="light"] .marketing .demo-count{color:#8b96ab}
:root[data-theme="light"] .marketing .demo-input{caret-color:#2968bd}
:root[data-theme="light"] .marketing .demo-input::selection{background:#c9dcff}
@media (max-width:56rem){.marketing .demo-grid{grid-template-columns:1fr}.marketing .demo-langs{max-height:12rem}.marketing .demo-gutter{min-width:2.25rem;max-width:2.75rem;padding:.75rem .35rem .75rem .6rem;font-size:.78rem}.marketing .demo-code,.marketing .demo-input{padding:.75rem .8rem;font-size:.78rem}}
`;
