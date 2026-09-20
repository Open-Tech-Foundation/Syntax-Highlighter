export const heroTabsStyles = `
.marketing .hero-tabs{display:flex;flex-direction:column;min-width:0}
.marketing .hero-tablist{display:flex;gap:.25rem;margin-left:auto}
.marketing .hero-tab{border:0;border-radius:.45rem;background:transparent;color:#8b99bb;font-size:.75rem;font-family:inherit;padding:.3rem .6rem;cursor:pointer}
.marketing .hero-tab:hover{color:#dbe4f5;background:#141d33}
.marketing .hero-tab.is-active{color:#fff;background:#1c2947}
.marketing .hero-panels{min-height:15rem;display:flex;flex-direction:column}
.marketing .hero-panels .is-hidden{display:none}
.marketing .hero-panels .code-sample{flex:1;margin:0}
.marketing .hero-term{height:15rem;padding:.75rem 1rem;background:#0b1120;overflow:hidden}
.marketing .hero-term .xterm{height:100%}
:root[data-theme="light"] .marketing .hero-tab{color:#5b6a89}
:root[data-theme="light"] .marketing .hero-tab:hover{color:#28334a;background:#eef1f6}
:root[data-theme="light"] .marketing .hero-tab.is-active{color:#182033;background:#e2e8f5}
`;
