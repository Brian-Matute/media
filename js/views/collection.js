/* =========================================================
   One collection: podium for the top three, then the rest.
   Toggle between ranked and release order.
   ========================================================= */

import { KINDS } from "../data.js";
import { esc, icon, img, card, tierBadge, segmented, emptyState, plural, kindMeta } from "../ui.js";
import { setPressed } from "../fx.js";

function rowHtml(m, rank) {
    return `
    <li>
        <a class="rank-row${m.tier ? ` t-${m.tier}` : ""}" href="${m.href}" data-key="${esc(m.key)}">
            <span class="rank-row__n" aria-label="Rank ${rank}">${rank}</span>
            <span class="rank-row__img" data-morph>${img(m, "thumb")}</span>
            <span class="rank-row__title"><strong>${esc(m.title)}</strong><span>${kindMeta(m)}${m.creator ? ` · ${esc(m.creator)}` : ""}</span></span>
            ${m.rating != null ? `<span class="meter" aria-hidden="true"><span style="--v:${m.rating}"></span></span>` : "<span></span>"}
            <span class="rank-row__score">${m.rating != null ? esc(m.rating) : "–"}</span>
            ${tierBadge(m.tier, "sm") || "<span></span>"}
        </a>
    </li>`;
}

function listHtml(c, mode) {
    const rankOf = new Map(c.members.map((m, i) => [m.key, i + 1]));
    if (mode === "release") {
        const byRelease = [...c.members].sort((a, b) => (a.yearStart ?? 9999) - (b.yearStart ?? 9999) || a.order - b.order);
        return `<ol class="ranking" data-stagger>${byRelease.map(m => rowHtml(m, rankOf.get(m.key))).join("")}</ol>`;
    }
    const podium = c.members.length >= 3 ? c.members.slice(0, 3) : [];
    const rest = c.members.slice(podium.length);
    return `
    ${podium.length ? `
    <div class="podium" data-stagger>
        ${podium.map((m, i) => `
        <div class="podium__spot podium__spot--${i + 1}">
            ${card(m, { i })}
            <div class="podium__base">
                <span class="podium__rank${i === 0 ? " grad-text" : ""}">${i + 1}</span>
                <span class="podium__score">${m.rating != null ? esc(m.rating) : "–"}${m.tier ? ` · ${m.tier} tier` : ""}</span>
            </div>
        </div>`).join("")}
    </div>` : ""}
    ${rest.length ? `<ol class="ranking" data-stagger style="margin-top:${podium.length ? "40px" : "0"}">${rest.map(m => rowHtml(m, rankOf.get(m.key))).join("")}</ol>` : ""}`;
}

export default function collection(route, archive, app) {
    const id = route.params.get("collection");
    const c = archive.collections.all.find(x => x.id === id);

    if (!c) {
        return {
            title: "Collection not found",
            html: `<div class="page-head">${emptyState({
                iconName: "stack",
                title: "That collection isn't here",
                body: "It may have been renamed or removed.",
                action: `<a class="btn btn--primary" href="./?view=collections">${icon("stack")}All collections</a>`
            })}</div>`
        };
    }

    let mode = route.params.get("order") === "release" ? "release" : "ranked";
    const kindCounts = Object.keys(KINDS)
        .map(k => [k, c.members.filter(m => m.kind === k).length])
        .filter(([, n]) => n)
        .map(([k, n]) => `${n} ${n === 1 ? KINDS[k].label.toLowerCase() : KINDS[k].plural.toLowerCase()}`)
        .join(" · ");
    const bg = c.members.filter(m => m.images).slice(0, 6);
    const isCreator = c.type === "creator";

    const html = `
    <section class="coll-hero">
        <div class="coll-hero__bg" aria-hidden="true">${bg.map(m => img(m, "thumb", { eager: true })).join("")}</div>
        <div class="coll-hero__inner">
            <a class="back-link" href="./?view=collections">${icon("arrowLeft")}All collections</a>
            <p class="eyebrow eyebrow--brand">${icon(isCreator ? "user" : "stack")}${isCreator ? "Director &amp; creator" : "Collection"}</p>
            <h1 class="page-head__title">${esc(c.title)}</h1>
            ${c.blurb ? `<p class="page-head__sub">${esc(c.blurb)}</p>` : ""}
            <div class="tiles" style="margin-top:30px" data-stagger>
                <div class="tile"><p class="tile__label">Titles</p><p class="tile__value" data-count="${c.count}">${c.count}</p><p class="tile__note">${kindCounts}</p></div>
                ${c.avg != null ? `<div class="tile"><p class="tile__label">Average score</p><p class="tile__value" data-count="${c.avg.toFixed(1)}" data-decimals="1">${c.avg.toFixed(1)}</p><p class="tile__note">out of 100</p></div>` : ""}
                ${c.best ? `<div class="tile"><p class="tile__label">Best</p><p class="tile__value">${esc(c.best.rating)}</p><p class="tile__note">${esc(c.best.title)}</p></div>` : ""}
                ${c.worst && c.count > 1 ? `<div class="tile"><p class="tile__label">Lowest</p><p class="tile__value">${esc(c.worst.rating)}</p><p class="tile__note">${esc(c.worst.title)}</p></div>` : ""}
            </div>
        </div>
    </section>

    <section class="section section--tight">
        <div class="section__head">
            <div><h2 class="section__title" id="coll-mode-title">${mode === "ranked" ? "The ranking" : "In release order"}</h2></div>
            ${segmented([{ value: "ranked", label: "Ranked" }, { value: "release", label: "Release order" }], mode, { name: "order", label: "Order" })}
        </div>
        <div id="coll-list">${listHtml(c, mode)}</div>
        ${isCreator ? `<p style="margin-top:28px"><a class="link-more" href="./?view=library&creator=${encodeURIComponent(c.title.split(/,| & /)[0])}&sort=ratingHigh">Open in the library${icon("arrowRight")}</a></p>` : ""}
    </section>`;

    function mount(root) {
        const seg = root.querySelector('[data-seg="order"]');
        const list = root.querySelector("#coll-list");
        const heading = root.querySelector("#coll-mode-title");
        seg.addEventListener("click", e => {
            const b = e.target.closest("[data-value]");
            if (!b || b.dataset.value === mode) return;
            mode = b.dataset.value;
            setPressed(seg, mode);
            heading.textContent = mode === "ranked" ? "The ranking" : "In release order";
            list.innerHTML = listHtml(c, mode);
            app.enhance(list);
            const params = new URLSearchParams({ collection: c.id });
            if (mode === "release") params.set("order", "release");
            app.setParams(params);
        });
    }

    return { title: c.title, html, mount };
}
