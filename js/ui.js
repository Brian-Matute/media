/* =========================================================
   UI: icons and the markup pieces shared by every view.
   ========================================================= */

import { KINDS, TIERS, statusTone } from "./data.js";

export function esc(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function plural(n, word, many = `${word}s`) {
    return `${n.toLocaleString()} ${n === 1 ? word : many}`;
}

export function fmtYear(year) {
    return esc(String(year || "").replace(/\s*-\s*/g, "–"));
}

export function linkLabel(url) {
    if (/imdb\.com/i.test(url)) return "IMDb";
    if (/rottentomatoes\.com/i.test(url)) return "Rotten Tomatoes";
    if (/letterboxd\.com/i.test(url)) return "Letterboxd";
    if (/backloggd\.com/i.test(url)) return "Backloggd";
    if (/metacritic\.com/i.test(url)) return "Metacritic";
    if (/howlongtobeat\.com/i.test(url)) return "HowLongToBeat";
    if (/igdb\.com/i.test(url)) return "IGDB";
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "Link"; }
}

export function fmtScore(n, digits = 1) {
    if (n == null) return "–";
    return Number.isInteger(n) ? String(n) : n.toFixed(digits);
}

/* ---------- icons (24px grid, 2px strokes) ---------- */

const PATHS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.2-4.2"/>',
    home: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v11.5h13V9"/><path d="M10 20.5v-6h4v6"/>',
    library: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
    tiers: '<path d="M4 5.5h16"/><path d="M4 10.5h12"/><path d="M4 15.5h8"/><path d="M4 20.5h4"/>',
    stack: '<rect x="3.5" y="7.5" width="13" height="13" rx="2"/><path d="M7.5 4h11a2 2 0 0 1 2 2v11"/>',
    chart: '<path d="M3.5 20.5h17"/><path d="M7 16.5v-5"/><path d="M12 16.5v-12"/><path d="M17 16.5V9"/>',
    film: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M8 3.5v17"/><path d="M16 3.5v17"/><path d="M3.5 8h4.5"/><path d="M3.5 16h4.5"/><path d="M16 8h4.5"/><path d="M16 16h4.5"/><path d="M8 12h8"/>',
    tv: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="m8 2.5 4 4 4-4"/>',
    gamepad: '<path d="M6 11h4"/><path d="M8 9v4"/><circle cx="15.5" cy="12.5" r=".9" fill="currentColor" stroke="none"/><circle cx="17.8" cy="10.2" r=".9" fill="currentColor" stroke="none"/><path d="M7.2 5.5h9.6a4 4 0 0 1 3.95 3.4l.9 6.1a3.1 3.1 0 0 1-5.3 2.6L14.5 15.5h-5l-1.85 2.1a3.1 3.1 0 0 1-5.3-2.6l.9-6.1A4 4 0 0 1 7.2 5.5z"/>',
    dice: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none"/>',
    arrowLeft: '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    arrowUp: '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    external: '<path d="M14 4h6v6"/><path d="M10 14 20 4"/><path d="M19 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5H10"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    sliders: '<path d="M4 6.5h9"/><path d="M17 6.5h3"/><circle cx="15" cy="6.5" r="2"/><path d="M4 12h3"/><path d="M11 12h9"/><circle cx="9" cy="12" r="2"/><path d="M4 17.5h11"/><path d="M19 17.5h1"/><circle cx="17" cy="17.5" r="2"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
    list: '<path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none"/>',
    sparkles: '<path d="M11 3.5 12.8 8.2 17.5 10l-4.7 1.8L11 16.5l-1.8-4.7L4.5 10l4.7-1.8z"/><path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    trophy: '<path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 6H4.5v1a3.5 3.5 0 0 0 3.2 3.5"/><path d="M16.5 6h3v1a3.5 3.5 0 0 1-3.2 3.5"/><path d="M12 13.5V17"/><path d="M8 20.5h8"/><path d="M9.5 20.5V18.5a2.5 2.5 0 0 1 5 0v2"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17"/><path d="M8 3v4"/><path d="M16 3v4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    monitor: '<rect x="3" y="4" width="18" height="12.5" rx="2.5"/><path d="M8.5 20.5h7"/><path d="M12 16.5v4"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
    check: '<path d="M20 6.5 9 17.5l-5-5"/>',
    link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
    star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9L3.5 9.7l5.9-.8z"/>',
    flame: '<path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-4.5-4-6.5-4.5-11-2.5 2-4 4-4 6.5-1-.5-1.8-1.6-2-2.8C6.6 9 5.5 11.4 5.5 14.5A6.5 6.5 0 0 0 12 21z"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor" stroke="none"/>',
    pulse: '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
    hourglass: '<path d="M6.5 3.5h11"/><path d="M6.5 20.5h11"/><path d="M7.5 3.5c0 4.5 4.5 5.5 4.5 8.5s-4.5 4-4.5 8.5"/><path d="M16.5 3.5c0 4.5-4.5 5.5-4.5 8.5s4.5 4 4.5 8.5"/>'
};

export function icon(name, cls = "") {
    const body = PATHS[name] || PATHS.sparkles;
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

/* ---------- images ---------- */

/* Uses the fast copy first and quietly falls back to the original file,
   then to a styled title card, if a copy is missing. */
export function img(item, size = "thumb", { cls = "", eager = false, alt = "" } = {}) {
    const set = item.images;
    if (!set) return fallbackCard(item);
    const src = size === "large" ? set.large : set.thumb;
    const chain = [set.original].filter(u => u && u !== src).join("|");
    return `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}"${chain ? ` data-fallback="${esc(chain)}"` : ""} data-title="${esc(item.title)}" loading="${eager ? "eager" : "lazy"}" decoding="async"${eager ? ' fetchpriority="high"' : ""}>`;
}

export function fallbackCard(item) {
    return `<div class="poster-fallback">${esc(item.title)}</div>`;
}

/* ---------- badges ---------- */

export function tierBadge(tier, size = "", extra = "") {
    if (!tier) return "";
    return `<span class="tier tier--${tier}${size ? ` tier--${size}` : ""} ${extra}">${tier}<span class="sr-only"> tier</span></span>`;
}

export function statusChip(item, extra = "") {
    if (!item.status) return "";
    const tone = statusTone(item.status);
    if (item.kind === "show" && tone === "done") return "";   // "Completed" on every show is noise
    return `<span class="status-chip status--${tone} ${extra}">${esc(item.status)}</span>`;
}

export function kindMeta(item) {
    const bits = [fmtYear(item.year)];
    bits.push(item.kind === "game" && item.platform ? esc(item.platform) : KINDS[item.kind].label);
    return bits.filter(Boolean).join(" · ");
}

/* ---------- cards ---------- */

export function card(item, { i = 0, eager = false, meta } = {}) {
    const tier = item.tier || "";
    return `
    <a class="card${item.kind === "game" ? " card--game" : ""}${tier ? ` is-${tier} t-${tier}` : ""}" href="${item.href}" data-key="${esc(item.key)}" style="--i:${i}">
        <div class="card__media" data-morph>
            ${img(item, "thumb", { cls: "card__img", eager })}
            <span class="card__shine" aria-hidden="true"></span>
            ${tierBadge(item.tier, "", "card__tier")}
            ${item.rating != null ? `<span class="score-pill card__score">${esc(item.rating)}<span class="sr-only"> out of 100</span></span>` : ""}
            ${statusChip(item, "card__status")}
        </div>
        <div class="card__body">
            <h3 class="card__title">${esc(item.title)}</h3>
            <p class="card__meta">${meta ?? kindMeta(item)}</p>
        </div>
    </a>`;
}

export function sectionHead({ eyebrow, title, sub = "", href = "", linkText = "See all", eyebrowIcon = "" }) {
    return `
    <div class="section__head">
        <div>
            ${eyebrow ? `<p class="eyebrow eyebrow--brand">${eyebrowIcon ? icon(eyebrowIcon) : ""}${esc(eyebrow)}</p>` : ""}
            <h2 class="section__title">${title}</h2>
            ${sub ? `<p class="section__sub">${sub}</p>` : ""}
        </div>
        ${href ? `<a class="link-more" href="${href}">${esc(linkText)}${icon("arrowRight")}</a>` : ""}
    </div>`;
}

export function rail(inner, cls = "") {
    return `
    <div class="rail ${cls}" data-rail>
        <div class="rail__track">${inner}</div>
        <button class="rail__btn rail__btn--prev" type="button" aria-label="Scroll back">${icon("chevronLeft")}</button>
        <button class="rail__btn rail__btn--next" type="button" aria-label="Scroll forward">${icon("chevronRight")}</button>
    </div>`;
}

export function segmented(options, active, { name = "section", label = "Filter" } = {}) {
    return `
    <div class="seg" role="group" aria-label="${esc(label)}" data-seg="${esc(name)}">
        ${options.map(o => `
        <button class="seg__btn" type="button" data-value="${esc(o.value)}" aria-pressed="${o.value === active}">
            ${o.icon ? icon(o.icon) : ""}${esc(o.label)}${o.count != null ? `<span class="seg__count">${o.count}</span>` : ""}
        </button>`).join("")}
        <span class="seg__thumb" aria-hidden="true"></span>
    </div>`;
}

export function emptyState({ iconName = "search", title, body = "", action = "" }) {
    return `
    <div class="empty">
        <div class="empty__icon">${icon(iconName)}</div>
        <h2>${esc(title)}</h2>
        ${body ? `<p>${body}</p>` : ""}
        ${action}
    </div>`;
}

export function tierRank(t) {
    return TIERS.indexOf(t);
}

/* Shown wherever games are listed or scored */
export function gamesNote() {
    return `
    <p class="note-banner">${icon("gamepad")}<span><strong>How games are scored:</strong> strictly on their story and campaign modes. Multiplayer and online modes don't count toward the rating.</span></p>`;
}

export function pct(n, total) {
    if (!total) return "0%";
    const p = (n / total) * 100;
    return p > 0 && p < 1 ? "<1%" : `${Math.round(p)}%`;
}

/* One whole split by tier: a 28px segmented bar plus a legend in block order */
export function tierShare(list, { legend = true } = {}) {
    const total = list.filter(i => i.tier).length;
    if (!total) return "";
    const parts = TIERS.map(t => ({ t, n: list.filter(i => i.tier === t).length })).filter(p => p.n > 0);
    const bar = `
    <div class="share-bar" role="list" aria-label="Titles by tier">
        ${parts.map((p, i) => {
            const share = pct(p.n, total);
            return `<span class="share-bar__part t-${p.t}" role="listitem" tabindex="0" style="flex:${p.n};--i:${i}"
                aria-label="${p.t} tier: ${plural(p.n, "title")}, ${share}"
                data-tip-value="${plural(p.n, "title")} · ${share}" data-tip-label="${p.t} tier" data-tip-color="var(--tier-${p.t})"><span class="lbl" aria-hidden="true">${share}</span></span>`;
        }).join("")}
    </div>`;
    const key = legend ? `
    <div class="legend" aria-hidden="true">
        ${parts.map(p => `<span class="legend__item"><span class="legend__swatch t-${p.t}"></span>${p.t} tier</span>`).join("")}
    </div>` : "";
    return bar + key;
}

/* A collection as a fan of its three best posters */
export function collCard(c, { compact = false, i = 0 } = {}) {
    const top = c.members.filter(m => m.images).slice(0, 3);
    const fan = top.length === 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[1], top[0]] : top;
    return `
    <a class="coll-card${compact ? " coll-card--compact" : ""}" href="${c.href}" style="--i:${i}">
        <div class="coll-card__fan${fan.length === 1 ? " is-single" : ""}" aria-hidden="true">
            ${fan.map(m => `<span class="fan-img">${img(m, "thumb")}</span>`).join("")}
        </div>
        <div class="coll-card__body">
            <h3 class="coll-card__title">${esc(c.title)}</h3>
            <p class="coll-card__meta"><span>${plural(c.count, "title")}</span>${c.avg != null ? `<span class="dot-sep">avg ${c.avg.toFixed(1)}</span>` : ""}</p>
            ${c.best ? `<p class="coll-card__best">Best: <strong>${esc(c.best.title)}</strong> · ${esc(c.best.rating)}</p>` : ""}
        </div>
    </a>`;
}

export function dataTable(headers, rows) {
    return `
    <details class="table-view">
        <summary>View as table</summary>
        <div class="table-scroll">
            <table class="data-table">
                <thead><tr>${headers.map(h => `<th${h.num ? ' class="num"' : ""}>${esc(h.label)}</th>`).join("")}</tr></thead>
                <tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${headers[i].num ? ' class="num"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</tbody>
            </table>
        </div>
    </details>`;
}
