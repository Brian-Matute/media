/* =========================================================
   Stats: the numbers behind the ratings.
   One filter row (type) scopes every tile and chart.
   ========================================================= */

import { TIERS, KINDS, average, median, countBy, sortItems } from "../data.js";
import { esc, icon, img, tierBadge, segmented, plural, fmtYear, emptyState, dataTable, tierShare, pct, gamesNote } from "../ui.js";
import { setPressed, showTip, hideTip } from "../fx.js";

const SECTIONS = [
    { value: "all", label: "All" },
    { value: "movie", label: "Movies" },
    { value: "show", label: "Shows" },
    { value: "game", label: "Games" }
];

/* ---------- helpers ---------- */

function niceMax(v) {
    if (v <= 0) return 1;
    const mag = 10 ** Math.floor(Math.log10(v));
    for (const s of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (s * mag >= v) return s * mag;
    return 10 * mag;
}

function groupAvg(list, keyFn, min) {
    const map = new Map();
    list.forEach(i => {
        if (i.rating == null) return;
        [].concat(keyFn(i)).filter(k => k != null && k !== "").forEach(k => {
            if (!map.has(k)) map.set(k, []);
            map.get(k).push(i);
        });
    });
    return [...map.entries()]
        .filter(([, items]) => items.length >= min)
        .map(([key, items]) => ({ key, n: items.length, avg: average(items) }))
        .sort((a, b) => b.avg - a.avg);
}

function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return ((h >>> 0) % 1000) / 1000;
}

/* ---------- chart pieces ---------- */

function columns(data, { axis = false, labelAll = false } = {}) {
    const max = Math.max(1, ...data.map(d => d.value));
    const top = niceMax(max);
    const peak = data.findIndex(d => d.value === max);
    return `
    <div class="cols${axis ? " cols--axis" : ""}">
        <div class="cols__plot">
            ${axis ? `<div class="cols__grid" aria-hidden="true">
                ${[top / 2, top].map(t => `<span class="cols__gridline" style="--y:${(t / top) * 100}"><span>${Number.isInteger(t) ? t : t.toFixed(1)}</span></span>`).join("")}
            </div>` : ""}
            ${data.map((d, i) => `
            <div class="cols__col" tabindex="0" aria-label="${esc(d.tipLabel || d.label)}: ${esc(d.tip)}"
                 data-tip-value="${esc(d.tip)}" data-tip-label="${esc(d.tipLabel || d.label)}" data-tip-color="var(--data)">
                ${(labelAll || i === peak) && d.value > 0 ? `<span class="cols__val" aria-hidden="true">${d.value}</span>` : ""}
                <span class="cols__bar" style="--v:${(d.value / top) * 100};--i:${i}"></span>
            </div>`).join("")}
        </div>
        <div class="cols__labels" aria-hidden="true">${data.map(d => `<span>${esc(d.label)}</span>`).join("")}</div>
    </div>`;
}

function hbars(data) {
    const max = Math.max(1, ...data.map(d => d.value));
    return `
    <div class="hbars">
        ${data.map((d, i) => `
        <div class="hbar" tabindex="0" aria-label="${esc(d.label)}: ${esc(d.tip)}"
             data-tip-value="${esc(d.tip)}" data-tip-label="${esc(d.label)}" data-tip-color="var(--data)">
            <span class="hbar__label">${esc(d.label)}</span>
            <span class="hbar__track">
                <span class="hbar__bar" style="--v:${(d.value / max) * 100};--i:${i}"></span>
                <span class="hbar__val">${esc(d.value.toLocaleString())}${d.sub ? ` <small>${esc(d.sub)}</small>` : ""}</span>
            </span>
        </div>`).join("")}
    </div>`;
}

function miniList(items, start = 1) {
    return `
    <div class="mini-list">
        ${items.map((it, i) => `
        <a class="mini" href="${it.href}" data-key="${esc(it.key)}">
            <span class="mini__n">${start + i}</span>
            <span class="mini__img" data-morph>${img(it, "thumb")}</span>
            <span class="mini__title"><strong>${esc(it.title)}</strong><span>${fmtYear(it.year)} · ${KINDS[it.kind].label}</span></span>
            ${tierBadge(it.tier, "sm") || "<span></span>"}
            <span class="mini__score">${it.rating ?? "–"}</span>
        </a>`).join("")}
    </div>`;
}

/* ---------- scatter: score vs release year ---------- */

function drawScatter(host, list, app) {
    const points = list.filter(i => i.rating != null && i.yearStart != null);
    host.innerHTML = "";
    if (points.length < 2) {
        host.innerHTML = `<p class="muted">Not enough rated titles to plot yet.</p>`;
        return () => {};
    }

    const W = host.clientWidth || 600;
    const H = host.clientHeight || 360;
    const m = { l: 34, r: 10, t: 12, b: 28 };
    const years = points.map(p => p.yearStart);
    const x0 = Math.floor(Math.min(...years) / 10) * 10;
    const x1 = Math.ceil((Math.max(...years) + 1) / 10) * 10;
    const y0 = Math.max(0, Math.floor((Math.min(...points.map(p => p.rating)) - 1) / 10) * 10);
    const y1 = 100;
    const sx = v => m.l + ((v - x0) / (x1 - x0)) * (W - m.l - m.r);
    const sy = v => m.t + (1 - (v - y0) / (y1 - y0)) * (H - m.t - m.b);

    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("aria-hidden", "true");

    const add = (tag, attrs, parent = svg) => {
        const el = document.createElementNS(NS, tag);
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
        parent.append(el);
        return el;
    };

    for (let y = y0; y <= y1; y += 10) {
        add("line", { class: "gridline", x1: m.l, x2: W - m.r, y1: sy(y), y2: sy(y) });
        const t = add("text", { class: "axis-label", x: m.l - 8, y: sy(y) + 4, "text-anchor": "end" });
        t.textContent = y;
    }
    const step = (x1 - x0) > 60 ? 20 : 10;
    for (let x = x0; x <= x1; x += step) {
        add("line", { class: "gridline", x1: sx(x), x2: sx(x), y1: m.t, y2: H - m.b });
        const t = add("text", { class: "axis-label", x: sx(x), y: H - 8, "text-anchor": "middle" });
        t.textContent = String(x);
    }

    const placed = points
        .sort((a, b) => a.yearStart - b.yearStart)
        .map((p, i) => {
            const jitter = (hash(p.key) - 0.5) * 0.7;
            const cx = sx(p.yearStart + 0.5 + jitter);
            const cy = sy(p.rating);
            const dot = add("circle", { class: "dot", cx, cy, r: 4.5, style: `fill:${p.tier ? `var(--tier-${p.tier})` : "var(--data)"};--i:${i}` });
            dot.dataset.tier = p.tier || "";
            return { p, cx, cy, dot };
        });

    const ring = add("circle", { class: "hover-ring", r: 9, cx: 0, cy: 0, opacity: 0 });
    host.append(svg);

    let hovered = null;
    const nearest = e => {
        const r = svg.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * W;
        const py = ((e.clientY - r.top) / r.height) * H;
        let best = null;
        let bestD = Infinity;
        for (const q of placed) {
            if (q.dot.classList.contains("is-dim")) continue;
            const d = (q.cx - px) ** 2 + (q.cy - py) ** 2;
            if (d < bestD) { bestD = d; best = q; }
        }
        const scale = r.width / W;
        return best && Math.sqrt(bestD) * scale <= 24 ? best : null;
    };

    const move = e => {
        const q = nearest(e);
        if (q === hovered) return;
        hovered = q;
        if (!q) {
            ring.setAttribute("opacity", 0);
            hideTip();
            svg.style.cursor = "default";
            return;
        }
        ring.setAttribute("cx", q.cx);
        ring.setAttribute("cy", q.cy);
        ring.setAttribute("opacity", 1);
        svg.style.cursor = "pointer";
        const r = svg.getBoundingClientRect();
        const scale = r.width / W;
        showTip({
            value: `${q.p.rating}`,
            label: `${q.p.title} · ${q.p.yearStart}${q.p.tier ? ` · ${q.p.tier} tier` : ""}`,
            color: q.p.tier ? `var(--tier-${q.p.tier})` : "var(--data)"
        }, { left: r.left + q.cx * scale - 6, top: r.top + q.cy * scale - 6, width: 12, height: 12 });
    };
    const leave = () => {
        hovered = null;
        ring.setAttribute("opacity", 0);
        hideTip();
    };
    const click = e => {
        const q = nearest(e);
        if (q) app.navigate(q.p.href);
    };

    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerleave", leave);
    svg.addEventListener("click", click);
    return () => hideTip();
}

/* ---------- the body for one slice ---------- */

function insightsFor(list) {
    const out = [];
    const decades = groupAvg(list, i => i.decade, 3);
    if (decades.length >= 2) {
        const d = decades[0];
        out.push(["calendar", `The <strong>${d.key}s</strong> are the best-rated decade, averaging <strong>${d.avg.toFixed(1)}</strong> across ${plural(d.n, "title")}.`]);
    }
    const genres = groupAvg(list, i => i.genres, 5);
    if (genres.length >= 2) {
        const hi = genres[0];
        const lo = genres[genres.length - 1];
        out.push(["flame", `<strong>${esc(hi.key)}</strong> scores highest of any genre, at <strong>${hi.avg.toFixed(1)}</strong> on average.`]);
        out.push(["target", `<strong>${esc(lo.key)}</strong> is the lowest-rated genre, averaging <strong>${lo.avg.toFixed(1)}</strong>.`]);
    }
    const people = countBy(list, i => i.people);
    if (people.length && people[0][1] >= 2) {
        const [name, n] = people[0];
        const avg = average(list.filter(i => i.people.includes(name)));
        out.push(["user", `<strong>${esc(name)}</strong> shows up the most: ${plural(n, "title")}${avg != null ? `, averaging <strong>${avg.toFixed(1)}</strong>` : ""}.`]);
    }
    return out.slice(0, 4);
}

function body(list, section) {
    if (!list.length) {
        return emptyState({
            iconName: section === "game" ? "gamepad" : "chart",
            title: section === "game" ? "No games logged yet" : "Nothing to count yet",
            body: section === "game" ? "Stats for games will show up here once a few are logged." : ""
        });
    }

    const rated = list.filter(i => i.rating != null);
    const avg = average(list);
    const med = median(list);
    const sCount = list.filter(i => i.tier === "S").length;
    const ninety = rated.filter(i => i.rating >= 90).length;
    const people = countBy(list, i => i.people);
    const games = list.filter(i => i.kind === "game");
    const hours = games.reduce((s, g) => s + g.hours, 0);
    const kinds = Object.keys(KINDS)
        .map(k => [k, list.filter(i => i.kind === k).length])
        .filter(([, n]) => n)
        .map(([k, n]) => `${n} ${n === 1 ? KINDS[k].label.toLowerCase() : KINDS[k].plural.toLowerCase()}`)
        .join(" · ");

    const tiles = [
        ["Titles", list.length, 0, kinds],
        ["Average score", avg != null ? Number(avg.toFixed(1)) : null, 1, med != null ? `median ${Number.isInteger(med) ? med : med.toFixed(1)}` : ""],
        ["S-tier picks", sCount, 0, `${pct(sCount, list.length)} of titles`],
        ["Scored 90+", ninety, 0, `${pct(ninety, rated.length)} of rated titles`],
        [games.length === list.length ? "Developers" : "Directors & creators", people.length, 0, people[0] ? `most: ${people[0][0]} (${people[0][1]})` : ""],
        ...(games.length ? [["Hours played", hours, 0, `across ${plural(games.length, "game")}`]] : [])
    ].filter(t => t[1] != null);

    // Score distribution
    const bins = [
        ["<60", "below 60", -Infinity, 60], ["60", "60–64", 60, 65], ["65", "65–69", 65, 70], ["70", "70–74", 70, 75],
        ["75", "75–79", 75, 80], ["80", "80–84", 80, 85], ["85", "85–89", 85, 90], ["90", "90–94", 90, 95], ["95+", "95–100", 95, Infinity]
    ].map(([label, range, lo, hi]) => {
        const n = rated.filter(i => i.rating >= lo && i.rating < hi).length;
        return { label, range, value: n, tip: plural(n, "title"), tipLabel: `Scored ${range}` };
    });

    // Decades
    const decadeRows = groupAvg(list, i => i.decade, 1).sort((a, b) => a.key - b.key);
    const decadeCols = decadeRows.map(d => ({
        label: `${String(d.key).slice(2)}s`,
        value: d.n,
        tip: `${plural(d.n, "title")} · avg ${d.avg.toFixed(1)}`,
        tipLabel: `${d.key}s`
    }));

    // Genres
    const genreRows = countBy(list, i => i.genres).slice(0, 10).map(([g, n]) => {
        const a = average(list.filter(i => i.genres.includes(g)));
        return { label: g, value: n, sub: a != null ? `avg ${a.toFixed(0)}` : "", tip: `${plural(n, "title")}${a != null ? ` · avg ${a.toFixed(1)}` : ""}`, avg: a };
    });

    // Tier table
    const tierRows = TIERS.map(t => {
        const inTier = list.filter(i => i.tier === t);
        const a = average(inTier);
        return [`${t}`, inTier.length, pct(inTier.length, list.filter(i => i.tier).length), a != null ? a.toFixed(1) : "–"];
    });

    // Leaders
    const leaders = people.filter(([, n]) => n >= 2).slice(0, 8).map(([name, n]) => {
        const theirs = sortItems(list.filter(i => i.people.includes(name)), "ratingHigh");
        return { name, n, avg: average(theirs), best: theirs[0] };
    });

    const top = sortItems(rated, "ratingHigh").slice(0, 10);
    const bottom = sortItems(rated, "ratingLow").slice(0, 5);

    // Platforms (games)
    const platformRows = games.length ? countBy(games, g => g.platform).map(([p, n]) => {
        const h = games.filter(g => g.platform === p).reduce((s, g) => s + g.hours, 0);
        return { label: p, value: n, sub: h ? `${h.toLocaleString()} hrs` : "", tip: `${plural(n, "game")}${h ? ` · ${h.toLocaleString()} hours` : ""}` };
    }) : [];

    const insights = insightsFor(list);

    return `
    ${section === "game" ? gamesNote() : ""}
    <div class="tiles" data-stagger>
        ${tiles.map(([label, value, dec, note]) => `
        <div class="tile">
            <p class="tile__label">${esc(label)}</p>
            <p class="tile__value" data-count="${value}" data-decimals="${dec}">${dec ? value.toFixed(dec) : value.toLocaleString()}</p>
            ${note ? `<p class="tile__note" title="${esc(note)}">${esc(note)}</p>` : ""}
        </div>`).join("")}
    </div>

    ${insights.length ? `
    <div class="insights" data-stagger>
        ${insights.map(([ic, text]) => `<div class="insight"><span class="insight__icon">${icon(ic)}</span><p>${text}</p></div>`).join("")}
    </div>` : ""}

    <div class="panels">
        <section class="panel panel--wide" data-reveal>
            <div class="panel__head"><h2 class="panel__title">Tier breakdown</h2><p class="panel__sub">Share of tiered titles in each tier</p></div>
            ${tierShare(list)}
            ${dataTable([{ label: "Tier" }, { label: "Titles", num: true }, { label: "Share", num: true }, { label: "Avg score", num: true }],
                tierRows.map(([t, n, share, a]) => [t, n, share, a]))}
        </section>

        <section class="panel" data-reveal>
            <div class="panel__head"><h2 class="panel__title">Score distribution</h2><p class="panel__sub">Titles in each score range</p></div>
            ${columns(bins, { axis: true })}
            ${dataTable([{ label: "Score range" }, { label: "Titles", num: true }], bins.map(b => [esc(b.range), b.value]))}
        </section>

        <section class="panel" data-reveal>
            <div class="panel__head"><h2 class="panel__title">By release decade</h2><p class="panel__sub">Titles released in each decade</p></div>
            ${columns(decadeCols, { labelAll: true })}
            ${dataTable([{ label: "Decade" }, { label: "Titles", num: true }, { label: "Avg score", num: true }],
                decadeRows.map(d => [`${d.key}s`, d.n, d.avg.toFixed(1)]))}
        </section>

        <section class="panel panel--wide" data-reveal>
            <div class="panel__head">
                <h2 class="panel__title">Score vs. release year</h2>
                <p class="panel__sub">Each dot is one title. Hover for details, click to open it.</p>
            </div>
            <div class="scatter" id="scatter"></div>
            <div class="legend" id="scatter-legend" role="group" aria-label="Highlight a tier">
                ${TIERS.filter(t => list.some(i => i.tier === t)).map(t => `
                <button class="legend__item" type="button" data-tier="${t}" aria-pressed="false" style="cursor:pointer"><span class="legend__dot t-${t}"></span>${t} tier</button>`).join("")}
            </div>
            ${dataTable([{ label: "Title" }, { label: "Year", num: true }, { label: "Score", num: true }, { label: "Tier" }],
                sortItems(rated, "yearOld").map(i => [`<a href="${i.href}">${esc(i.title)}</a>`, i.yearStart ?? "–", i.rating, i.tier || "–"]))}
        </section>

        <section class="panel" data-reveal>
            <div class="panel__head"><h2 class="panel__title">Top genres</h2><p class="panel__sub">Most-logged genres, with their average score</p></div>
            ${hbars(genreRows)}
            ${dataTable([{ label: "Genre" }, { label: "Titles", num: true }, { label: "Avg score", num: true }],
                genreRows.map(g => [esc(g.label), g.value, g.avg != null ? g.avg.toFixed(1) : "–"]))}
        </section>

        <section class="panel" data-reveal>
            <div class="panel__head"><h2 class="panel__title">${games.length === list.length ? "Most-played developers" : "Most-watched directors & creators"}</h2><p class="panel__sub">Two or more titles</p></div>
            ${leaders.length ? `
            <div class="leaders">
                ${leaders.map((l, i) => `
                <a class="leader" href="./?view=library&creator=${encodeURIComponent(l.name)}&sort=ratingHigh">
                    <span class="leader__n">${i + 1}</span>
                    <span class="leader__name">${esc(l.name)}<small>Best: ${esc(l.best.title)}</small></span>
                    <span class="leader__val">${l.n} · avg ${l.avg != null ? l.avg.toFixed(1) : "–"}</span>
                </a>`).join("")}
            </div>` : `<p class="muted">No one appears more than once yet.</p>`}
        </section>

        ${platformRows.length ? `
        <section class="panel" data-reveal>
            <div class="panel__head"><h2 class="panel__title">Platforms</h2><p class="panel__sub">Games per platform</p></div>
            ${hbars(platformRows)}
        </section>` : ""}

        <section class="panel panel--two-thirds" data-reveal>
            <div class="panel__head"><h2 class="panel__title">Top 10</h2><p class="panel__sub">Highest rated</p></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:4px 18px">
                ${miniList(top.slice(0, 5))}
                ${top.length > 5 ? miniList(top.slice(5), 6) : ""}
            </div>
        </section>

        <section class="panel panel--third" data-reveal>
            <div class="panel__head"><h2 class="panel__title">Bottom of the pile</h2><p class="panel__sub">Lowest rated</p></div>
            ${miniList(bottom)}
        </section>
    </div>`;
}

export default function stats(route, archive, app) {
    let section = ["movie", "show", "game"].includes(route.params.get("s")) ? route.params.get("s") : "all";
    const pool = () => section === "all" ? archive.items : archive.items.filter(i => i.kind === section);
    const counts = Object.fromEntries(SECTIONS.map(s => [s.value, s.value === "all" ? archive.items.length : archive.items.filter(i => i.kind === s.value).length]));

    const html = `
    <header class="page-head">
        <p class="eyebrow eyebrow--brand">${icon("chart")}Stats</p>
        <h1 class="page-head__title">By the <span class="grad-text">numbers</span></h1>
        <p class="page-head__sub">How the ratings shake out: tiers, scores, decades, genres, and the names that keep showing up.</p>
    </header>
    <div class="stats-filters">
        ${segmented(SECTIONS.map(s => ({ ...s, count: counts[s.value] })), section, { name: "s", label: "Type" })}
    </div>
    <div class="stats-body" id="stats-body">${body(pool(), section)}</div>`;

    function mount(root) {
        const seg = root.querySelector('[data-seg="s"]');
        const host = root.querySelector("#stats-body");
        let stopScatter = () => {};
        let ro = null;

        const wire = () => {
            const scatterEl = host.querySelector("#scatter");
            const legend = host.querySelector("#scatter-legend");
            stopScatter();
            ro?.disconnect();
            if (!scatterEl) return;
            const draw = () => { stopScatter = drawScatter(scatterEl, pool(), app); applyHighlight(); };
            let lastW = 0;
            ro = new ResizeObserver(entries => {
                const w = Math.round(entries[0].contentRect.width);
                if (w && Math.abs(w - lastW) > 4) {
                    lastW = w;
                    draw();
                }
            });
            ro.observe(scatterEl);

            let highlighted = "";
            function applyHighlight() {
                scatterEl.querySelectorAll(".dot").forEach(d => d.classList.toggle("is-dim", Boolean(highlighted) && d.dataset.tier !== highlighted));
                legend?.querySelectorAll("[data-tier]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tier === highlighted)));
            }
            legend?.addEventListener("click", e => {
                const b = e.target.closest("[data-tier]");
                if (!b) return;
                highlighted = highlighted === b.dataset.tier ? "" : b.dataset.tier;
                applyHighlight();
            });
        };

        seg.addEventListener("click", e => {
            const b = e.target.closest("[data-value]");
            if (!b || b.dataset.value === section) return;
            section = b.dataset.value;
            setPressed(seg, section);
            host.innerHTML = body(pool(), section);
            app.enhance(host);
            wire();
            const params = new URLSearchParams({ view: "stats" });
            if (section !== "all") params.set("s", section);
            app.setParams(params);
        });

        wire();
        return () => {
            stopScatter();
            ro?.disconnect();
        };
    }

    return { title: "Stats", html, mount };
}
