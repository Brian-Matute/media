/* =========================================================
   App shell: routing, page transitions, global UI.

   Every page lives at index.html and is chosen by the URL:
     ./                      Home
     ./?view=library         Library (filters live in the URL too)
     ./?view=tiers           Tier list
     ./?view=collections     Collections
     ./?collection=<id>      One collection, ranked
     ./?view=stats           Stats
     ./?title=<id>           A movie or show
     ./?game=<id>            A game
   ========================================================= */

import { loadArchive } from "./data.js";
import { esc, icon, emptyState } from "./ui.js";
import * as fx from "./fx.js";
import { initSearch, openSearch } from "./search.js";

import home from "./views/home.js";
import library from "./views/library.js";
import tiers from "./views/tiers.js";
import collections from "./views/collections.js";
import collection from "./views/collection.js";
import stats from "./views/stats.js";
import title from "./views/title.js";

const VIEWS = { home, library, tiers, collections, collection, stats, title };
const LIST_VIEWS = ["library", "tiers", "collections", "stats"];

const main = document.getElementById("main");
const topbar = document.getElementById("topbar");
const toTop = document.getElementById("toTop");

if ("scrollRestoration" in history) history.scrollRestoration = "manual";

let archive = null;
let current = { name: "", key: null, cleanup: null };
let renderToken = 0;

/* ---------- routes ---------- */

export function parseRoute(search = location.search) {
    const p = new URLSearchParams(search);
    if (p.get("title")) return { name: "title", params: p, key: `m:${p.get("title")}` };
    if (p.get("game")) return { name: "title", params: p, key: `g:${p.get("game")}` };
    if (p.get("collection")) return { name: "collection", params: p };
    const view = p.get("view");
    if (LIST_VIEWS.includes(view)) return { name: view, params: p };
    if (["q", "s", "genre", "tier", "sort", "creator", "decade"].some(k => p.has(k))) return { name: "library", params: p };
    return { name: "home", params: p };
}

function samePath(url) {
    const strip = path => path.replace(/index\.html$/, "");
    return strip(url.pathname) === strip(location.pathname);
}

/* ---------- rendering ---------- */

function enhance(root) {
    fx.settleImages(root);
    fx.reveal(root);
    fx.countUp(root);
    fx.rails(root);
    fx.fitLabels(root);
    root.querySelectorAll(".seg").forEach(s => fx.positionSeg(s, false));
}

function setNav(routeName) {
    const key = { title: "", collection: "collections" }[routeName] ?? routeName;
    document.querySelectorAll("[data-nav]").forEach(a => {
        if (a.dataset.nav === key) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
    });
    const nav = document.querySelector(".mainnav");
    if (nav) fx.positionSeg(nav);
}

function errorView() {
    return {
        title: "Something went wrong",
        html: `<div class="page-head">${emptyState({
            iconName: "sparkles",
            title: "Something went wrong",
            body: "This page hit a snag while loading.",
            action: `<a class="btn btn--primary" href="./">${icon("home")}Back home</a>`
        })}</div>`
    };
}

async function render({ from = null, to = null, scroll = 0, focus = true, animate = true } = {}) {
    const token = ++renderToken;
    const route = parseRoute();
    const view = VIEWS[route.name] || home;

    let out;
    try {
        out = view(route, archive, app);
    } catch (err) {
        console.error(err);
        out = errorView();
    }

    const update = () => {
        if (token !== renderToken) return;
        try { current.cleanup?.(); } catch (err) { console.error(err); }
        fx.hideTip();
        main.innerHTML = out.html;
        document.title = out.title ? `${out.title} · Brian's Media Archive` : "Brian's Media Archive";
        setNav(route.name);
        window.scrollTo(0, scroll);
        let cleanup = null;
        try { cleanup = out.mount?.(main) || null; } catch (err) { console.error(err); }
        current = { name: route.name, key: route.key || null, cleanup };
        enhance(main);
        updateChrome();
    };

    if (animate) await fx.transition(update, { from, to });
    else update();

    if (focus && token === renderToken) main.focus({ preventScroll: true });
}

function findMorphTarget(key) {
    const host = main.querySelector(`[data-key="${CSS.escape(key)}"]`);
    if (!host) return null;
    return host.matches("[data-morph]") ? host : host.querySelector("[data-morph]");
}

export function navigate(href, { from = null, replace = false } = {}) {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin || !samePath(url)) {
        location.href = url.href;
        return;
    }
    if (url.search === location.search && !replace) {
        window.scrollTo({ top: 0, behavior: fx.reduced() ? "auto" : "smooth" });
        return;
    }
    history.replaceState({ ...(history.state || {}), scroll: window.scrollY }, "");
    history[replace ? "replaceState" : "pushState"]({ scroll: 0, fromApp: true }, "", url.pathname + url.search);
    const next = parseRoute(url.search);
    render({ from, to: next.name === "title" ? () => main.querySelector(".title-poster__frame") : null });
}

/* Views call this to keep the URL in sync with filters without re-rendering */
function setParams(params) {
    const qs = params.toString();
    const url = `${location.pathname}${qs ? `?${qs}` : ""}`;
    if (url !== location.pathname + location.search) history.replaceState(history.state, "", url);
}

const app = { navigate, setParams, enhance, parseRoute };

/* ---------- links, history, keyboard ---------- */

document.addEventListener("click", e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest("a[href]");
    if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download") || a.hasAttribute("data-native")) return;
    const url = new URL(a.getAttribute("href"), location.href);
    if (url.origin !== location.origin || !samePath(url)) return;
    if (url.hash && url.search === location.search) return;
    e.preventDefault();
    const from = a.matches("[data-morph]") ? a
        : a.querySelector("[data-morph]") || (a.dataset.morphFrom ? document.querySelector(a.dataset.morphFrom) : null);
    navigate(url.href, { from });
});

window.addEventListener("popstate", e => {
    const leaving = current.name === "title" ? current.key : null;
    render({
        from: leaving ? main.querySelector(".title-poster__frame") : null,
        to: leaving ? () => findMorphTarget(leaving) : null,
        scroll: e.state?.scroll ?? 0,
        focus: false
    });
});

document.addEventListener("keydown", e => {
    const typing = /^(input|textarea|select)$/i.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        openSearch();
    } else if (e.key === "/" && !typing) {
        e.preventDefault();
        openSearch();
    }
});

/* ---------- chrome: top bar + back-to-top ---------- */

let ticking = false;

function updateChrome() {
    const y = window.scrollY;
    topbar.classList.toggle("is-solid", y > 24);
    toTop.classList.toggle("is-on", y > 1400);
}

window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
        ticking = false;
        updateChrome();
    });
}, { passive: true });

toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: fx.reduced() ? "auto" : "smooth" }));

let resizeTimer = 0;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        fx.positionAllSegs();
        fx.fitLabels(main);
    }, 120);
});

/* ---------- boot ---------- */

fx.installImageHandlers();
fx.installTilt(main);
fx.installTips(main);

document.querySelectorAll("[data-open-search]").forEach(b => b.addEventListener("click", () => openSearch()));
document.querySelectorAll("[data-kbd]").forEach(k => {
    k.textContent = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent) ? "⌘ K" : "Ctrl K";
});

main.innerHTML = `<div class="boot" role="status"><div class="boot__ring"></div>Loading the archive…</div>`;

loadArchive()
    .then(data => {
        archive = data;
        initSearch(archive, app);
        return render({ animate: false, focus: false, scroll: history.state?.scroll ?? 0 });
    })
    .catch(err => {
        console.error(err);
        main.innerHTML = `<div class="page-head">${emptyState({
            iconName: "sparkles",
            title: "The archive didn't load",
            body: `Check your connection and try again. <span class="sr-only">${esc(String(err))}</span>`,
            action: `<a class="btn btn--primary" href="./" data-native>Reload</a>`
        })}</div>`;
    });

document.fonts?.ready.then(() => fx.positionAllSegs());
