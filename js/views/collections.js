/* =========================================================
   Collections: franchises (from data/collections.json)
   and directors & creators with 3+ titles (automatic).
   ========================================================= */

import { icon, collCard, emptyState, plural } from "../ui.js";
import { applyGlow } from "../fx.js";

export default function collections(route, archive) {
    const { curated, creators } = archive.collections;

    const html = `
    <header class="page-head">
        <p class="eyebrow eyebrow--brand">${icon("stack")}Collections</p>
        <h1 class="page-head__title">Ranked, <span class="grad-text">franchise by franchise</span></h1>
        <p class="page-head__sub">Every series and filmmaker in the archive, ordered from best to worst. ${plural(curated.length + creators.length, "collection")} and counting.</p>
    </header>

    ${curated.length ? `
    <section class="section section--tight" data-reveal>
        <div class="section__head"><div><h2 class="section__title">Franchises</h2><p class="section__sub">Universes, sagas, and series.</p></div></div>
        <div class="coll-grid" data-stagger>${curated.map((c, i) => collCard(c, { i })).join("")}</div>
    </section>` : ""}

    ${creators.length ? `
    <section class="section" data-reveal>
        <div class="section__head"><div><h2 class="section__title">Directors &amp; creators</h2><p class="section__sub">Anyone with three or more titles in the archive gets their own ranking.</p></div></div>
        <div class="coll-grid coll-grid--compact" data-stagger>${creators.map((c, i) => collCard(c, { i, compact: true })).join("")}</div>
    </section>` : ""}

    ${!curated.length && !creators.length ? `<div class="section">${emptyState({ iconName: "stack", title: "No collections yet", body: `Add franchises to <code>data/collections.json</code> to see them ranked here.` })}</div>` : ""}`;

    function mount(root) {
        root.querySelectorAll(".coll-card").forEach(c => {
            c.addEventListener("pointerenter", () => applyGlow(c, c.querySelector(".fan-img:nth-child(2) img") || c.querySelector("img")), { once: true });
        });
    }

    return { title: "Collections", html, mount };
}
