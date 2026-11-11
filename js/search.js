/* =========================================================
   Search palette: Ctrl/Cmd+K or "/" from anywhere.
   ========================================================= */

import { normalizeText, KINDS } from "./data.js";
import { esc, icon, img, tierBadge, fmtYear } from "./ui.js";

const RECENT_KEY = "bma.recent";

let archive = null;
let app = null;
let root = null;
let input = null;
let list = null;
let options = [];
let active = -1;
let lastFocus = null;

/* ---------- recently viewed (this browser only) ---------- */

function readRecent() {
    try {
        const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function rememberRecent(key) {
    try {
        const next = [key, ...readRecent().filter(k => k !== key)].slice(0, 8);
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch { /* storage can be unavailable; that's fine */ }
}

/* ---------- matching ---------- */

function scoreItem(item, q, words) {
    const t = item.titleNorm;
    if (t === q) return 100;
    if (t.startsWith(q)) return 85;
    if (t.split(" ").some(w => w.startsWith(q))) return 75;
    if (words.every(w => t.includes(w))) return 60;
    if (words.every(w => item.haystack.includes(w))) return 30;
    return 0;
}

function highlight(text, raw) {
    const q = raw.trim();
    if (!q) return esc(text);
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i === -1) return esc(text);
    return `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length))}`;
}

function quickActions() {
    return [
        { kind: "action", label: "Surprise me", sub: "Open a random title", iconName: "dice", run: () => {
            const pool = archive.items;
            const pick = pool[Math.floor(Math.random() * pool.length)];
            if (pick) app.navigate(pick.href);
        } },
        { kind: "action", label: "Highest rated", sub: "The library, best first", iconName: "trophy", href: "./?view=library&sort=ratingHigh" },
        { kind: "action", label: "Tier list", sub: "S through F", iconName: "tiers", href: "./?view=tiers" },
        { kind: "action", label: "Collections", sub: "Franchises and filmographies, ranked", iconName: "stack", href: "./?view=collections" },
        { kind: "action", label: "Stats", sub: "The numbers behind the ratings", iconName: "chart", href: "./?view=stats" }
    ];
}

function build(raw) {
    const q = normalizeText(raw);
    const groups = [];

    if (!q) {
        const recent = readRecent().map(k => archive.byKey.get(k)).filter(Boolean).slice(0, 5);
        if (recent.length) groups.push({ label: "Recently viewed", items: recent.map(item => ({ kind: "item", item })) });
        groups.push({ label: "Jump to", items: quickActions() });
        return groups;
    }

    const words = q.split(" ");

    const titles = archive.items
        .map(item => ({ item, s: scoreItem(item, q, words) }))
        .filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s || (b.item.rating ?? 0) - (a.item.rating ?? 0))
        .slice(0, 8)
        .map(x => ({ kind: "item", item: x.item }));
    if (titles.length) groups.push({ label: "Titles", items: titles });

    const colls = archive.collections.all
        .filter(c => words.every(w => normalizeText(c.title).includes(w)))
        .slice(0, 3)
        .map(c => ({ kind: "collection", c }));
    if (colls.length) groups.push({ label: "Collections", items: colls });

    const seenPeople = new Set();
    const people = [];
    for (const item of archive.items) {
        for (const person of item.people) {
            if (seenPeople.has(person)) continue;
            seenPeople.add(person);
            const norm = normalizeText(person);
            if (words.every(w => norm.includes(w))) people.push(person);
        }
    }
    if (people.length) {
        groups.push({
            label: "People",
            items: people.slice(0, 3).map(person => ({
                kind: "action",
                label: person,
                sub: `${archive.items.filter(i => i.people.includes(person)).length} in the archive`,
                iconName: "user",
                href: `./?view=library&creator=${encodeURIComponent(person)}&sort=ratingHigh`
            }))
        });
    }

    const genres = [...new Set(archive.items.flatMap(i => i.genres))]
        .filter(g => words.every(w => normalizeText(g).includes(w)))
        .slice(0, 2);
    if (genres.length) {
        groups.push({
            label: "Genres",
            items: genres.map(g => ({
                kind: "action",
                label: g,
                sub: `${archive.items.filter(i => i.genres.includes(g)).length} titles`,
                iconName: "sparkles",
                href: `./?view=library&genre=${encodeURIComponent(g)}&sort=ratingHigh`
            }))
        });
    }

    return groups;
}

/* ---------- rendering ---------- */

function optionHtml(opt, idx, raw) {
    if (opt.kind === "item") {
        const it = opt.item;
        const sub = [fmtYear(it.year), KINDS[it.kind].label, esc(it.creator)].filter(Boolean).join(" · ");
        return `
        <li class="palette__opt" role="option" id="pal-${idx}" data-idx="${idx}" aria-selected="false">
            <span class="palette__thumb">${img(it, "thumb")}</span>
            <span class="palette__text"><strong>${highlight(it.title, raw)}</strong><span>${sub}</span></span>
            <span class="palette__end">${tierBadge(it.tier, "sm")}${it.rating != null ? esc(it.rating) : ""}</span>
        </li>`;
    }
    if (opt.kind === "collection") {
        const c = opt.c;
        return `
        <li class="palette__opt" role="option" id="pal-${idx}" data-idx="${idx}" aria-selected="false">
            <span class="palette__thumb">${c.members[0] ? img(c.members[0], "thumb") : icon("stack")}</span>
            <span class="palette__text"><strong>${highlight(c.title, raw)}</strong><span>${c.count} titles${c.avg != null ? ` · avg ${c.avg.toFixed(1)}` : ""}</span></span>
            <span class="palette__end">${icon("stack")}</span>
        </li>`;
    }
    return `
    <li class="palette__opt" role="option" id="pal-${idx}" data-idx="${idx}" aria-selected="false">
        <span class="palette__thumb palette__thumb--icon">${icon(opt.iconName)}</span>
        <span class="palette__text"><strong>${highlight(opt.label, raw)}</strong><span>${esc(opt.sub || "")}</span></span>
        <span class="palette__end">${icon("arrowRight")}</span>
    </li>`;
}

function update() {
    const raw = input.value;
    const groups = build(raw);
    options = groups.flatMap(g => g.items);

    if (!options.length) {
        list.innerHTML = `<li class="palette__empty" role="presentation">Nothing in the archive matches “${esc(raw.trim())}”.</li>`;
        active = -1;
        input.removeAttribute("aria-activedescendant");
        return;
    }

    let idx = 0;
    list.innerHTML = groups.map(g => `
        <li class="palette__group" role="presentation">${esc(g.label)}</li>
        ${g.items.map(opt => optionHtml(opt, idx++, raw)).join("")}`).join("");

    setActive(0, false);
}

function setActive(idx, scroll = true) {
    if (!options.length) return;
    active = (idx + options.length) % options.length;
    list.querySelectorAll(".palette__opt").forEach(el => {
        const on = Number(el.dataset.idx) === active;
        el.setAttribute("aria-selected", String(on));
        if (on && scroll) el.scrollIntoView({ block: "nearest" });
    });
    input.setAttribute("aria-activedescendant", `pal-${active}`);
}

function choose(idx) {
    const opt = options[idx];
    if (!opt) return;
    closeSearch(false);
    if (opt.kind === "item") app.navigate(opt.item.href);
    else if (opt.kind === "collection") app.navigate(opt.c.href);
    else if (opt.run) opt.run();
    else if (opt.href) app.navigate(opt.href);
}

function onKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
    else if (e.key === "Enter") { e.preventDefault(); choose(active); }
    else if (e.key === "Escape") { e.preventDefault(); closeSearch(); }
    else if (e.key === "Tab") { e.preventDefault(); setActive(active + (e.shiftKey ? -1 : 1)); }
}

/* ---------- open / close ---------- */

export function initSearch(data, appRef) {
    archive = data;
    app = appRef;
    root = document.getElementById("palette");
    input = root.querySelector(".palette__input");
    list = root.querySelector(".palette__list");

    root.addEventListener("click", e => {
        if (e.target.closest("[data-close]")) { closeSearch(); return; }
        const opt = e.target.closest("[data-idx]");
        if (opt) choose(Number(opt.dataset.idx));
    });
    list.addEventListener("pointermove", e => {
        const opt = e.target.closest("[data-idx]");
        if (opt && Number(opt.dataset.idx) !== active) setActive(Number(opt.dataset.idx), false);
    });
    input.addEventListener("input", update);
    input.addEventListener("keydown", onKey);
}

export function openSearch(prefill = "") {
    if (!root || !archive || !root.hidden) return;
    lastFocus = document.activeElement;
    root.hidden = false;
    document.documentElement.classList.add("is-locked");
    input.value = prefill;
    update();
    requestAnimationFrame(() => input.focus());
}

export function closeSearch(restoreFocus = true) {
    if (!root || root.hidden) return;
    root.hidden = true;
    document.documentElement.classList.remove("is-locked");
    if (restoreFocus) lastFocus?.focus?.({ preventScroll: true });
}
