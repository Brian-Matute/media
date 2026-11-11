/* =========================================================
   Tier list: S through F, best-rated first in each row.
   ========================================================= */

import { TIERS, KINDS, average, sortItems } from "../data.js";
import { esc, icon, img, segmented, plural, emptyState, gamesNote } from "../ui.js";
import { setPressed } from "../fx.js";

const SECTIONS = [
    { value: "all", label: "All" },
    { value: "movie", label: "Movies" },
    { value: "show", label: "Shows" },
    { value: "game", label: "Games" }
];

function board(items, section) {
    const tiered = items.filter(i => i.tier);
    if (!tiered.length) {
        return emptyState({ iconName: "tiers", title: "Nothing to rank yet", body: "Titles show up here once they have a tier." });
    }
    return (section === "game" ? gamesNote() : "") + TIERS.map((t, r) => {
        const row = sortItems(items.filter(i => i.tier === t), "ratingHigh");
        const avg = average(row);
        return `
        <section class="tierrow tierrow--${t} t-${t}" data-reveal style="--i:${r}" aria-label="${t} tier, ${plural(row.length, "title")}">
            <div class="tierrow__label">
                <span class="tierrow__letter" aria-hidden="true">${t}</span>
                <span class="tierrow__meta">${plural(row.length, "title")}${avg != null ? `<br>avg ${avg.toFixed(1)}` : ""}</span>
            </div>
            <div class="tierrow__items" data-stagger>
                ${row.length ? row.map(i => `
                <a class="tieritem${i.kind === "game" ? " card--game" : ""}" href="${i.href}" data-key="${esc(i.key)}" data-morph
                   aria-label="${esc(i.title)}${i.rating != null ? `, ${esc(i.rating)} out of 100` : ""}"
                   data-tip-value="${esc(i.title)}" data-tip-label="${esc([i.year.replace(/\s*-\s*/g, "–"), KINDS[i.kind].label, i.rating != null ? `${i.rating}/100` : ""].filter(Boolean).join(" · "))}" data-tip-color="var(--tier-${t})">
                    ${img(i, "thumb")}
                    ${i.rating != null ? `<span class="tieritem__score" aria-hidden="true">${esc(i.rating)}</span>` : ""}
                </a>`).join("") : `<span class="tier-empty">Nothing here yet</span>`}
            </div>
        </section>`;
    }).join("");
}

export default function tiers(route, archive, app) {
    const p = route.params;
    let section = ["movie", "show", "game"].includes(p.get("s")) ? p.get("s") : "all";
    const pool = () => section === "all" ? archive.items : archive.items.filter(i => i.kind === section);
    const counts = Object.fromEntries(SECTIONS.map(s => [s.value, s.value === "all" ? archive.items.length : archive.items.filter(i => i.kind === s.value).length]));

    const html = `
    <header class="page-head">
        <p class="eyebrow eyebrow--brand">${icon("tiers")}Tier list</p>
        <h1 class="page-head__title">From <span class="grad-text">S</span> to F</h1>
        <p class="page-head__sub">Every title, placed in a tier. Hover or tap a poster for the details.</p>
    </header>
    <div class="tier-controls">
        ${segmented(SECTIONS.map(s => ({ ...s, count: counts[s.value] })), section, { name: "s", label: "Type" })}
        <a class="link-more" href="./?view=library&sort=tier">See it as a grid${icon("arrowRight")}</a>
    </div>
    <div class="tierboard" id="tierboard">${board(pool(), section)}</div>`;

    function mount(root) {
        const seg = root.querySelector('[data-seg="s"]');
        const boardEl = root.querySelector("#tierboard");
        seg.addEventListener("click", e => {
            const b = e.target.closest("[data-value]");
            if (!b || b.dataset.value === section) return;
            section = b.dataset.value;
            setPressed(seg, section);
            boardEl.innerHTML = board(pool(), section);
            app.enhance(boardEl);
            const params = new URLSearchParams({ view: "tiers" });
            if (section !== "all") params.set("s", section);
            app.setParams(params);
        });
    }

    return { title: "Tier List", html, mount };
}
