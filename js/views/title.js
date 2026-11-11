/* =========================================================
   Title page: one movie, show, or game.
   ========================================================= */

import { KINDS, statusTone } from "../data.js";
import { esc, icon, img, card, tierBadge, rail, sectionHead, plural, fmtYear, emptyState, linkLabel, gamesNote } from "../ui.js";
import { applyGlow, tiltOne, toast } from "../fx.js";
import { rememberRecent } from "../search.js";

const RING_R = 46;
const RING_C = 2 * Math.PI * RING_R;

function franchiseKey(title) {
    return title.split(/[:(]| - /)[0].trim().toLowerCase()
        .replace(/^the\s+/, "")
        .replace(/\s+(\d+|ii|iii|iv|v|vi|vii|viii|ix)$/i, "")
        .replace(/[^a-z0-9 ]/g, "")
        .split(" ").slice(0, 2).join(" ");
}

function related(item, items, memberOf) {
    const fk = franchiseKey(item.title);
    const myCollections = new Set((memberOf.get(item.key) || []).filter(m => m.collection.type === "franchise").map(m => m.collection.id));
    return items
        .filter(o => o !== item)
        .map(o => {
            let score = 0;
            if (fk && franchiseKey(o.title) === fk) score += 5;
            if ((memberOf.get(o.key) || []).some(m => myCollections.has(m.collection.id))) score += 4;
            if (o.people.some(p => item.people.includes(p))) score += 3;
            score += o.genres.filter(g => item.genres.includes(g)).length;
            if (o.kind === item.kind) score += 0.5;
            return { o, score };
        })
        .filter(x => x.score >= 3)
        .sort((a, b) => b.score - a.score || (b.o.rating ?? 0) - (a.o.rating ?? 0))
        .slice(0, 12)
        .map(x => x.o);
}

function peopleLinks(item) {
    return item.people.map(p => `<a href="./?view=library&creator=${encodeURIComponent(p)}&sort=ratingHigh">${esc(p)}</a>`).join(", ");
}

export default function title(route, archive, app) {
    const item = archive.byKey.get(route.key);

    if (!item) {
        return {
            title: "Not found",
            html: `<div class="page-head">${emptyState({
                iconName: "film",
                title: "That title isn't in the archive",
                body: "It may have been renamed or removed.",
                action: `<a class="btn btn--primary" href="./?view=library">${icon("library")}Browse the library</a>`
            })}</div>`
        };
    }

    const kind = KINDS[item.kind];
    const isGame = item.kind === "game";
    const sameKind = archive.items.filter(i => i.kind === item.kind);
    const idx = sameKind.indexOf(item);
    const prev = sameKind[idx - 1];
    const next = sameKind[idx + 1];
    const tierPeers = item.tier ? sameKind.filter(i => i.tier === item.tier).length : 0;
    const memberships = (archive.memberOf.get(item.key) || [])
        .sort((a, b) => (a.collection.type === "franchise" ? 0 : 1) - (b.collection.type === "franchise" ? 0 : 1));
    const more = related(item, archive.items, archive.memberOf);
    const lowerPlural = kind.plural.toLowerCase();

    const creatorLabel = isGame ? "Developer" : item.kind === "show" ? "Created by" : "Directed by";
    const facts = [
        [creatorLabel, "user", item.people.length ? peopleLinks(item) : ""],
        ["Released", "calendar", fmtYear(item.year)],
        [isGame ? "Platform" : "", "monitor", esc(item.platform)],
        [isGame ? "Status" : item.kind === "show" ? "Progress" : "", "pulse", esc(item.status)],
        [isGame ? "Hours played" : "", "hourglass", item.hours ? `${item.hours.toLocaleString()} hours` : ""],
        [isGame ? "Played" : "Watched", "clock", esc(item.date)]
    ].filter(([label, , value]) => label && value);

    let standing = "";
    if (item.rank) {
        standing = item.rank === 1
            ? `${item.tied ? "Tied for the" : "The"} top score among ${item.rankOf} ${lowerPlural}`
            : `${item.tied ? "Tied for " : ""}#${item.rank} of ${item.rankOf} ${lowerPlural} by score`;
    }

    const meterText = item.rating == null ? ""
        : item.rank === 1 ? `Nothing in the ${kind.label.toLowerCase()} log scores higher.`
        : `Higher than ${item.percentile}% of the ${lowerPlural} in the archive.`;

    const html = `
    <article class="title-page${item.tier ? ` t-${item.tier}` : ""}">
        <div class="title-backdrop" aria-hidden="true">${item.images ? img(item, "thumb", { eager: true }) : ""}</div>

        <div class="title-hero">
            <a class="back-link" href="./?view=library" data-back>${icon("arrowLeft")}Back</a>

            <div class="title-grid">
                <div class="title-poster${isGame ? " is-game" : ""}">
                    <div class="title-poster__frame">${img(item, "large", { eager: true, alt: `${item.title} ${isGame ? "cover" : "poster"}` })}</div>
                </div>

                <div class="title-info">
                    <div class="title-kicker">
                        <span class="kind-chip">${icon(kind.icon)}${kind.label}</span>
                        <span>${fmtYear(item.year)}</span>
                        ${item.status && statusTone(item.status) !== "done" ? `<span class="dot-sep">${esc(item.status)}</span>` : ""}
                    </div>

                    <h1 class="title-name">${esc(item.title)}</h1>

                    ${item.genres.length ? `<div class="title-tags">${item.genres.map(g =>
                        `<a class="tag" href="./?view=library&genre=${encodeURIComponent(g)}&sort=ratingHigh">${esc(g)}</a>`).join("")}</div>` : ""}

                    ${item.rating != null || item.tier ? `
                    <div class="verdict">
                        ${item.rating != null ? `
                        <div class="ring" role="img" aria-label="Scored ${esc(item.rating)} out of 100">
                            <svg viewBox="0 0 108 108" aria-hidden="true">
                                <circle class="ring__track" cx="54" cy="54" r="${RING_R}"/>
                                <circle class="ring__value" cx="54" cy="54" r="${RING_R}" stroke-dasharray="${RING_C.toFixed(2)}" stroke-dashoffset="${RING_C.toFixed(2)}"/>
                            </svg>
                            <span class="ring__num" data-count="${esc(item.rating)}" aria-hidden="true">${esc(item.rating)}</span>
                        </div>` : ""}
                        ${tierBadge(item.tier, "xl")}
                        <div class="verdict__text">
                            <strong>${item.tier ? `${item.tier} tier` : "Not tiered yet"}</strong>
                            ${standing ? `<span>${standing}</span>` : ""}
                            ${item.tier ? `<span>${tierPeers === 1 ? `The only ${kind.label.toLowerCase()}` : `One of ${tierPeers} ${lowerPlural}`} in ${item.tier} tier</span>` : ""}
                        </div>
                        ${item.rating != null ? `
                        <div class="verdict__meter">
                            <div class="meter" aria-hidden="true"><span style="--v:${item.rank === 1 ? 100 : item.percentile}"></span></div>
                            <p>${meterText}</p>
                        </div>` : ""}
                    </div>` : ""}

                    ${isGame ? `<div style="margin-top:24px">${gamesNote()}</div>` : ""}

                    ${facts.length ? `
                    <dl class="facts">
                        ${facts.map(([label, ic, value]) => `<div><dt>${icon(ic)}${label}</dt><dd>${value}</dd></div>`).join("")}
                    </dl>` : ""}

                    ${item.review ? `
                    <section class="thoughts" aria-label="My thoughts">
                        <blockquote>${esc(item.review)}</blockquote>
                    </section>` : `
                    <section class="thoughts thoughts--empty" aria-label="My thoughts">
                        <p>No write-up for this one yet.</p>
                    </section>`}

                    ${memberships.length ? `
                    <div class="member-of">
                        ${memberships.slice(0, 4).map(({ collection: c, position }) => `
                        <a class="member-chip" href="${c.href}">
                            <span class="member-chip__rank">#${position}</span>
                            <span><strong>${esc(c.title)}</strong><span>${position === 1 ? "Ranked first" : `${position} of ${c.count}`} in the ${c.type === "creator" ? "filmography" : "collection"}</span></span>
                        </a>`).join("")}
                    </div>` : ""}

                    <div class="title-actions">
                        ${item.links.map(u => `<a class="btn btn--primary btn--sm" href="${esc(u)}" target="_blank" rel="noopener">${esc(linkLabel(u))}${icon("external")}</a>`).join("")}
                        <button class="btn btn--ghost btn--sm" type="button" data-copy>${icon("link")}Copy link</button>
                        <button class="btn btn--ghost btn--sm" type="button" data-random>${icon("dice")}Random ${kind.label.toLowerCase()}</button>
                    </div>
                </div>
            </div>
        </div>

        ${more.length ? `
        <section class="section" data-reveal>
            ${sectionHead({ eyebrow: "More like this", eyebrowIcon: "sparkles", title: "If you liked this" })}
            ${rail(more.map((m, i) => card(m, { i })).join(""))}
        </section>` : ""}

        ${prev || next ? `
        <nav class="pager" aria-label="More ${lowerPlural}">
            ${prev ? `<a class="pager__prev" href="${prev.href}" data-key="${esc(prev.key)}"><span class="pager__img" data-morph>${img(prev, "thumb")}</span><span><small>Previous</small><strong>${esc(prev.title)}</strong></span></a>` : ""}
            ${next ? `<a class="pager__next" href="${next.href}" data-key="${esc(next.key)}"><span><small>Next</small><strong>${esc(next.title)}</strong></span><span class="pager__img" data-morph>${img(next, "thumb")}</span></a>` : ""}
        </nav>` : ""}
    </article>`;

    function mount(root) {
        rememberRecent(item.key);
        const page = root.querySelector(".title-page");
        const frame = root.querySelector(".title-poster__frame");
        const posterImg = frame?.querySelector("img");
        applyGlow(page, posterImg, "--ambient");

        const ring = root.querySelector(".ring__value");
        if (ring && item.rating != null) {
            requestAnimationFrame(() => requestAnimationFrame(() => {
                ring.style.strokeDashoffset = (RING_C * (1 - Math.max(0, Math.min(100, item.rating)) / 100)).toFixed(2);
            }));
        }

        const stopTilt = frame ? tiltOne(root.querySelector(".title-poster"), frame, 10) : () => {};

        root.querySelector("[data-back]")?.addEventListener("click", e => {
            if (history.state?.fromApp) {
                e.preventDefault();
                history.back();
            }
        });

        root.querySelector("[data-copy]")?.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(location.href);
                toast("Link copied");
            } catch {
                toast("Couldn't copy. Use the address bar instead.");
            }
        });

        root.querySelector("[data-random]")?.addEventListener("click", () => {
            const pool = sameKind.filter(i => i !== item);
            if (!pool.length) return;
            app.navigate(pool[Math.floor(Math.random() * pool.length)].href);
        });

        return stopTilt;
    }

    return { title: item.title, html, mount };
}
