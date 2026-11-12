/* =========================================================
   Library: everything, with search, filters, sorting,
   grid/list layouts, and groups for tier and year sorts.
   ========================================================= */

import { TIERS, KINDS, SORTS, sortItems, countBy, normalizeText } from "../data.js";
import { esc, icon, img, card, tierBadge, segmented, emptyState, plural, kindMeta, gamesNote } from "../ui.js";
import { setPressed } from "../fx.js";

// The library opens sorted best-first; "My order" is still in the sort menu
const DEFAULT_SORT = "ratingHigh";

const SECTIONS = [
    { value: "all", label: "All" },
    { value: "movie", label: "Movies" },
    { value: "show", label: "Shows" },
    { value: "game", label: "Games" }
];

function readState(p) {
    const decade = p.get("decade");
    return {
        s: ["movie", "show", "game"].includes(p.get("s")) ? p.get("s") : "all",
        q: p.get("q") || "",
        genre: p.get("genre") || "",
        status: p.get("status") || "",
        platform: p.get("platform") || "",
        creator: p.get("creator") || "",
        decade: /^\d{4}$/.test(decade || "") ? Number(decade) : null,
        tiers: new Set((p.get("tier") || "").toUpperCase().split("").filter(t => TIERS.includes(t))),
        sort: SORTS[p.get("sort")] ? p.get("sort") : DEFAULT_SORT,
        layout: p.get("layout") === "list" ? "list" : "grid"
    };
}

function toParams(st) {
    const p = new URLSearchParams({ view: "library" });
    if (st.s !== "all") p.set("s", st.s);
    if (st.q.trim()) p.set("q", st.q.trim());
    if (st.genre) p.set("genre", st.genre);
    if (st.status) p.set("status", st.status);
    if (st.platform) p.set("platform", st.platform);
    if (st.creator) p.set("creator", st.creator);
    if (st.decade != null) p.set("decade", String(st.decade));
    if (st.tiers.size) p.set("tier", TIERS.filter(t => st.tiers.has(t)).join(""));
    if (st.sort !== DEFAULT_SORT) p.set("sort", st.sort);
    if (st.layout !== "grid") p.set("layout", st.layout);
    return p;
}

function sectionPool(items, st) {
    return st.s === "all" ? items : items.filter(i => i.kind === st.s);
}

function applyFilters(items, st) {
    const words = normalizeText(st.q).split(" ").filter(Boolean);
    return sectionPool(items, st).filter(i => {
        if (words.length && !words.every(w => i.haystack.includes(w))) return false;
        if (st.genre && !i.genres.includes(st.genre)) return false;
        if (st.status && i.status !== st.status) return false;
        if (st.platform && i.platform !== st.platform) return false;
        if (st.creator && !i.people.includes(st.creator) && i.creator !== st.creator) return false;
        if (st.decade != null && i.decade !== st.decade) return false;
        if (st.tiers.size && !st.tiers.has(i.tier)) return false;
        return true;
    });
}

function activeCount(st) {
    return [st.genre, st.status, st.platform, st.creator, st.decade != null ? "d" : ""].filter(Boolean).length + st.tiers.size;
}

function groupsFor(list, sort) {
    if (sort === "tier") {
        return [...TIERS, null]
            .map(t => ({ title: t ? `${t} tier` : "Not tiered", badge: t, items: list.filter(i => (i.tier || null) === t) }))
            .filter(g => g.items.length);
    }
    if (sort === "yearNew" || sort === "yearOld") {
        const map = new Map();
        list.forEach(i => {
            const k = i.decade ?? "unknown";
            if (!map.has(k)) map.set(k, []);
            map.get(k).push(i);
        });
        return [...map.entries()].map(([d, items]) => ({ title: d === "unknown" ? "Year unknown" : `${d}s`, items }));
    }
    return [{ title: "", items: list }];
}

function rowHtml(it) {
    return `
    <a class="row${it.tier ? ` t-${it.tier}` : ""}" href="${it.href}" data-key="${esc(it.key)}">
        <span class="row__img" data-morph>${img(it, "thumb")}</span>
        <span class="row__title"><strong>${esc(it.title)}</strong><span>${kindMeta(it)}</span></span>
        <span class="row__cell col-type">${KINDS[it.kind].label}</span>
        <span class="row__cell col-genre">${esc(it.genres.slice(0, 3).join(" · "))}</span>
        <span class="row__cell col-creator">${esc(it.creator)}</span>
        <span class="row__score">${it.rating != null
            ? `<span class="meter" aria-hidden="true"><span style="--v:${it.rating}"></span></span><strong>${esc(it.rating)}</strong>`
            : "<strong>–</strong>"}</span>
        <span>${tierBadge(it.tier, "sm")}</span>
    </a>`;
}

function listHtml(items) {
    return `
    <div class="list" data-stagger>
        <div class="list-head" aria-hidden="true">
            <span></span><span>Title</span><span class="col-type">Type</span><span class="col-genre">Genre</span>
            <span class="col-creator">Director / creator</span><span>Score</span><span>Tier</span>
        </div>
        ${items.map(rowHtml).join("")}
    </div>`;
}

function resultsHtml(list, st, archive) {
    if (!list.length) {
        const noGames = st.s === "game" && !archive.items.some(i => i.kind === "game");
        if (noGames) {
            return emptyState({
                iconName: "gamepad",
                title: "Games are on the way",
                body: "No games have been logged yet. They'll show up here with platforms, hours played, and tiers.",
                action: `<a class="btn btn--ghost" href="add.html?type=game" data-native>${icon("plus")}Add a game</a>`
            });
        }
        return emptyState({
            iconName: "search",
            title: "Nothing matches",
            body: "Try a different search or loosen the filters.",
            action: `<button class="btn btn--ghost" type="button" data-clear>${icon("close")}Clear filters</button>`
        });
    }

    return (st.s === "game" ? gamesNote() : "") + groupsFor(list, st.sort).map(g => `
    <section class="group">
        ${g.title ? `
        <div class="group__head">
            ${g.badge ? tierBadge(g.badge) : ""}
            <h2 class="group__title">${esc(g.title)}</h2>
            <span class="group__count">${g.items.length}</span>
            <span class="group__line" aria-hidden="true"></span>
        </div>` : ""}
        ${st.layout === "list"
            ? listHtml(g.items)
            : `<div class="grid" data-stagger>${g.items.map((it, i) => card(it, { i })).join("")}</div>`}
    </section>`).join("");
}

export default function library(route, archive, app) {
    const st = readState(route.params);
    const counts = Object.fromEntries(SECTIONS.map(s => [s.value, s.value === "all" ? archive.items.length : archive.items.filter(i => i.kind === s.value).length]));

    const html = `
    <header class="page-head">
        <p class="eyebrow eyebrow--brand">${icon("library")}Library</p>
        <h1 class="page-head__title">The <span class="grad-text">Library</span></h1>
        <p class="page-head__sub">Every movie, show, and game in the archive. Search it, filter it, sort it however you like.</p>
    </header>

    <div class="toolbar" id="lib-toolbar">
        <div class="toolbar__inner">
            <div class="toolbar__row">
                ${segmented(SECTIONS.map(s => ({ ...s, count: counts[s.value] })), st.s, { name: "s", label: "Type" })}
                <div class="search-field toolbar__search">
                    ${icon("search")}
                    <input class="input" type="search" id="lib-q" value="${esc(st.q)}" placeholder="Search titles, people, genres…" autocomplete="off" aria-label="Search the library">
                </div>
                <div class="toolbar__end">
                    <button class="btn btn--ghost btn--sm toolbar__filters-btn" type="button" id="lib-filters-btn" aria-controls="lib-filters" aria-expanded="false">
                        ${icon("sliders")}Filters<span class="seg__count" id="lib-filter-n" hidden></span>
                    </button>
                    <button class="icon-btn" type="button" data-layout="grid" aria-label="Grid view" aria-pressed="${st.layout === "grid"}">${icon("grid")}</button>
                    <button class="icon-btn" type="button" data-layout="list" aria-label="List view" aria-pressed="${st.layout === "list"}">${icon("list")}</button>
                    <button class="icon-btn" type="button" id="lib-dice" aria-label="Surprise me: open a random title from these results" title="Surprise me">${icon("dice")}</button>
                </div>
            </div>

            <div class="filters" id="lib-filters" aria-label="Filters">
                <div class="filters__sheet-head">
                    <h2>Filters</h2>
                    <button class="icon-btn" type="button" data-close-sheet aria-label="Close filters">${icon("close")}</button>
                </div>
                <select class="select" id="lib-genre" aria-label="Genre"></select>
                <select class="select" id="lib-status" aria-label="Status"></select>
                <select class="select" id="lib-platform" aria-label="Platform"></select>
                <select class="select" id="lib-sort" aria-label="Sort">
                    ${Object.entries(SORTS).map(([k, v]) => `<option value="${k}"${k === st.sort ? " selected" : ""}>Sort: ${esc(v.label)}</option>`).join("")}
                </select>
                <div class="tier-toggles" role="group" aria-label="Tiers">
                    ${TIERS.map(t => `<button class="chip-toggle t-${t}" type="button" data-tier="${t}" aria-pressed="${st.tiers.has(t)}" aria-label="${t} tier">${t}</button>`).join("")}
                </div>
                <span class="filters__count" id="lib-count" aria-live="polite"></span>
                <div class="filters__sheet-foot">
                    <button class="btn btn--ghost" type="button" data-clear>Clear</button>
                    <button class="btn btn--primary" type="button" data-close-sheet id="lib-show">Show results</button>
                </div>
            </div>
        </div>
    </div>

    <div class="active-filters" id="lib-active" hidden></div>
    <div class="results" id="lib-results"></div>`;

    function mount(root) {
        const results = root.querySelector("#lib-results");
        const toolbar = root.querySelector("#lib-toolbar");
        const seg = root.querySelector('[data-seg="s"]');
        const q = root.querySelector("#lib-q");
        const genre = root.querySelector("#lib-genre");
        const status = root.querySelector("#lib-status");
        const platform = root.querySelector("#lib-platform");
        const sort = root.querySelector("#lib-sort");
        const countEl = root.querySelector("#lib-count");
        const activeEl = root.querySelector("#lib-active");
        const filters = root.querySelector("#lib-filters");
        const filtersBtn = root.querySelector("#lib-filters-btn");
        const filterN = root.querySelector("#lib-filter-n");
        const showBtn = root.querySelector("#lib-show");
        let current = [];

        const fill = (select, placeholder, entries, value) => {
            if (!entries.length) {
                select.hidden = true;
                select.innerHTML = "";
                return;
            }
            const has = entries.some(([v]) => v === value);
            const all = value && !has ? [[value, 0], ...entries] : entries;
            select.hidden = false;
            select.innerHTML = `<option value="">${esc(placeholder)}</option>` +
                all.map(([v, n]) => `<option value="${esc(v)}"${v === value ? " selected" : ""}>${esc(v)} (${n})</option>`).join("");
            select.classList.toggle("is-set", Boolean(value));
        };

        const fillSelects = () => {
            const base = sectionPool(archive.items, st);
            fill(genre, "All genres", countBy(base, i => i.genres), st.genre);
            const statusEntries = st.s === "show" || st.s === "game" ? countBy(base, i => i.status) : [];
            fill(status, st.s === "game" ? "Any status" : "Any progress", statusEntries, st.status);
            fill(platform, "All platforms", st.s === "game" ? countBy(base, i => i.platform) : [], st.platform);
            sort.value = st.sort;
            sort.classList.toggle("is-set", st.sort !== DEFAULT_SORT);
        };

        const renderPills = () => {
            const pills = [];
            if (st.q.trim()) pills.push(["q", `“${st.q.trim()}”`]);
            if (st.creator) pills.push(["creator", `By ${st.creator}`]);
            if (st.genre) pills.push(["genre", st.genre]);
            if (st.status) pills.push(["status", st.status]);
            if (st.platform) pills.push(["platform", st.platform]);
            if (st.decade != null) pills.push(["decade", `${st.decade}s`]);
            TIERS.filter(t => st.tiers.has(t)).forEach(t => pills.push([`tier:${t}`, `${t} tier`]));
            activeEl.hidden = !pills.length;
            activeEl.innerHTML = pills.map(([k, label]) =>
                `<button class="pill" type="button" data-remove="${esc(k)}" aria-label="Remove filter: ${esc(label)}">${esc(label)}${icon("close")}</button>`).join("") +
                (pills.length > 1 ? `<button class="link-btn" type="button" data-clear>Clear all</button>` : "");
            const n = activeCount(st);
            filterN.hidden = !n;
            filterN.textContent = n;
        };

        const scrollToResults = () => {
            const offset = toolbar.offsetHeight + parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--topbar-h")) + 12;
            const top = results.getBoundingClientRect().top + window.scrollY - offset;
            if (window.scrollY > top) window.scrollTo({ top });
        };

        const update = ({ scroll = true } = {}) => {
            current = sortItems(applyFilters(archive.items, st), st.sort);
            const total = sectionPool(archive.items, st).length;
            results.innerHTML = resultsHtml(current, st, archive);
            app.enhance(results);
            countEl.textContent = current.length === total ? plural(total, "title") : `${current.length} of ${total}`;
            showBtn.textContent = `Show ${plural(current.length, "result")}`;
            renderPills();
            root.querySelectorAll("[data-tier]").forEach(b => b.setAttribute("aria-pressed", String(st.tiers.has(b.dataset.tier))));
            root.querySelectorAll("[data-layout]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.layout === st.layout)));
            app.setParams(toParams(st));
            if (scroll) scrollToResults();
        };

        const clearAll = () => {
            st.q = st.genre = st.status = st.platform = st.creator = "";
            st.decade = null;
            st.tiers.clear();
            q.value = "";
            fillSelects();
            update();
        };

        /* events */
        seg.addEventListener("click", e => {
            const b = e.target.closest("[data-value]");
            if (!b || b.dataset.value === st.s) return;
            st.s = b.dataset.value;
            st.genre = st.status = st.platform = "";
            setPressed(seg, st.s);
            fillSelects();
            update();
        });

        let typing = 0;
        q.addEventListener("input", () => {
            clearTimeout(typing);
            typing = setTimeout(() => {
                st.q = q.value;
                update({ scroll: false });
            }, 140);
        });
        q.addEventListener("keydown", e => {
            if (e.key === "Escape" && q.value) {
                q.value = "";
                st.q = "";
                update({ scroll: false });
            }
        });

        genre.addEventListener("change", () => { st.genre = genre.value; genre.classList.toggle("is-set", Boolean(st.genre)); update(); });
        status.addEventListener("change", () => { st.status = status.value; status.classList.toggle("is-set", Boolean(st.status)); update(); });
        platform.addEventListener("change", () => { st.platform = platform.value; platform.classList.toggle("is-set", Boolean(st.platform)); update(); });
        sort.addEventListener("change", () => { st.sort = sort.value; sort.classList.toggle("is-set", st.sort !== DEFAULT_SORT); update(); });

        root.querySelector(".tier-toggles").addEventListener("click", e => {
            const b = e.target.closest("[data-tier]");
            if (!b) return;
            const t = b.dataset.tier;
            if (st.tiers.has(t)) st.tiers.delete(t);
            else st.tiers.add(t);
            update();
        });

        root.querySelectorAll("[data-layout]").forEach(b => b.addEventListener("click", () => {
            if (st.layout === b.dataset.layout) return;
            st.layout = b.dataset.layout;
            update({ scroll: false });
        }));

        root.querySelector("#lib-dice").addEventListener("click", e => {
            if (!current.length) return;
            const pick = current[Math.floor(Math.random() * current.length)];
            e.currentTarget.classList.remove("dice-spin");
            void e.currentTarget.offsetWidth;
            e.currentTarget.classList.add("dice-spin");
            const from = results.querySelector(`[data-key="${CSS.escape(pick.key)}"] [data-morph]`);
            setTimeout(() => app.navigate(pick.href, { from }), 280);
        });

        // (listeners go on the view's own elements: `root` outlives this page)
        const onClick = e => {
            if (e.target.closest("[data-clear]")) {
                clearAll();
                return;
            }
            const pill = e.target.closest("[data-remove]");
            if (pill) {
                const k = pill.dataset.remove;
                if (k.startsWith("tier:")) st.tiers.delete(k.slice(5));
                else if (k === "decade") st.decade = null;
                else {
                    st[k] = "";
                    if (k === "q") q.value = "";
                }
                fillSelects();
                update();
            }
        };
        [activeEl, results, filters].forEach(el => el.addEventListener("click", onClick));

        /* filters become a bottom sheet on small screens */
        let scrim = null;
        const onKey = e => { if (e.key === "Escape") closeSheet(); };
        const openSheet = () => {
            filters.classList.add("is-open");
            toolbar.classList.add("sheet-open");
            filtersBtn.setAttribute("aria-expanded", "true");
            scrim = document.createElement("div");
            scrim.className = "sheet-scrim";
            scrim.addEventListener("click", closeSheet);
            document.body.append(scrim);
            document.documentElement.classList.add("is-locked");
            document.addEventListener("keydown", onKey);
            setTimeout(() => filters.querySelector("select:not([hidden])")?.focus(), 60);
        };
        function closeSheet() {
            if (!filters.classList.contains("is-open")) return;
            filters.classList.remove("is-open");
            toolbar.classList.remove("sheet-open");
            filtersBtn.setAttribute("aria-expanded", "false");
            scrim?.remove();
            scrim = null;
            document.documentElement.classList.remove("is-locked");
            document.removeEventListener("keydown", onKey);
        }
        filtersBtn.addEventListener("click", openSheet);
        filters.addEventListener("click", e => {
            if (e.target.closest("[data-close-sheet]")) closeSheet();
        });

        fillSelects();
        update({ scroll: false });

        return () => {
            closeSheet();
            clearTimeout(typing);
        };
    }

    return { title: "Library", html, mount };
}
