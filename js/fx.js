/* =========================================================
   Effects: reveals, counters, tilt, poster colors, rails,
   sliding segmented thumbs, tooltips, toasts, and page
   transitions. Everything here respects reduced motion.
   ========================================================= */

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

export const reduced = () => motionQuery.matches;
export const canHover = () => hoverQuery.matches;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ---------- images: fade in on load, fall back when a copy is missing ---------- */

export function installImageHandlers() {
    document.addEventListener("load", e => {
        const el = e.target;
        if (el instanceof HTMLImageElement) el.classList.add("is-loaded");
    }, true);

    document.addEventListener("error", e => {
        const el = e.target;
        if (!(el instanceof HTMLImageElement)) return;
        const chain = (el.dataset.fallback || "").split("|").filter(Boolean);
        if (chain.length) {
            el.dataset.fallback = chain.slice(1).join("|");
            el.src = chain[0];
            return;
        }
        const card = document.createElement("div");
        card.className = "poster-fallback";
        card.textContent = el.dataset.title || el.alt || "";
        el.replaceWith(card);
    }, true);
}

export function settleImages(root) {
    root.querySelectorAll("img").forEach(i => {
        if (i.complete && i.naturalWidth) i.classList.add("is-loaded");
    });
}

/* ---------- scroll reveals ---------- */

let revealObserver = null;

export function reveal(root) {
    const targets = root.querySelectorAll("[data-reveal], [data-stagger]");
    root.querySelectorAll("[data-stagger]").forEach(group =>
        [...group.children].forEach((child, i) => child.style.setProperty("--i", i)));

    if (!("IntersectionObserver" in window) || reduced()) {
        targets.forEach(t => t.classList.add("is-in"));
        return;
    }

    revealObserver ??= new IntersectionObserver(entries => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add("is-in");
            revealObserver.unobserve(entry.target);
        }
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0 });

    targets.forEach(t => revealObserver.observe(t));
}

/* ---------- counting numbers ---------- */

function formatCount(value, decimals) {
    return value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function countUp(root) {
    const els = [...root.querySelectorAll("[data-count]")];
    if (!els.length || reduced() || !("IntersectionObserver" in window)) return;

    const run = el => {
        const target = parseFloat(el.dataset.count);
        const decimals = Number(el.dataset.decimals || 0);
        if (!Number.isFinite(target)) return;
        const duration = 1500;
        const start = performance.now();
        const step = now => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 4);
            el.textContent = formatCount(target * eased, decimals);
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(entries => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            io.unobserve(entry.target);
            run(entry.target);
        }
    }, { threshold: 0.3 });

    els.forEach(el => {
        el.textContent = formatCount(0, Number(el.dataset.decimals || 0));
        io.observe(el);
    });
}

/* ---------- poster colors ---------- */

const colorCache = new Map();

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [h * 60, s, l];
}

function hslToRgb(h, s, l) {
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/* The most vivid color family in an image, brightened so it glows on dark. */
export function posterColor(imgEl) {
    if (!imgEl || !imgEl.complete || !imgEl.naturalWidth) return null;
    const src = imgEl.currentSrc || imgEl.src;
    if (colorCache.has(src)) return colorCache.get(src);

    let result = null;
    try {
        const canvas = document.createElement("canvas");
        canvas.width = 24;
        canvas.height = 36;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(imgEl, 0, 0, 24, 36);
        const data = ctx.getImageData(0, 0, 24, 36).data;
        const buckets = Array.from({ length: 12 }, () => ({ w: 0, h: 0, s: 0, l: 0 }));
        for (let i = 0; i < data.length; i += 4) {
            const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
            if (s < 0.22 || l < 0.12 || l > 0.88) continue;
            const weight = s * (1 - Math.abs(l - 0.5) * 1.4);
            const b = buckets[Math.floor(h / 30) % 12];
            b.w += weight; b.h += h * weight; b.s += s * weight; b.l += l * weight;
        }
        const best = buckets.reduce((a, b) => (b.w > a.w ? b : a));
        if (best.w > 0.6) {
            const h = best.h / best.w;
            const s = clamp(best.s / best.w + 0.15, 0.55, 0.95);
            const l = clamp(best.l / best.w, 0.52, 0.64);
            result = hslToRgb(h, s, l).join(" ");
        }
    } catch {
        result = null;   // e.g. a cover hosted on another site
    }
    colorCache.set(src, result);
    return result;
}

export function applyGlow(el, imgEl, prop = "--glow") {
    const apply = () => {
        const color = posterColor(imgEl);
        if (color) el.style.setProperty(prop, color);
    };
    if (!imgEl) return;
    if (imgEl.complete && imgEl.naturalWidth) apply();
    else imgEl.addEventListener("load", apply, { once: true });
}

/* ---------- 3D tilt + glare on cards (delegated, mouse only) ---------- */

export function installTilt(root) {
    if (!canHover()) return;
    let current = null;
    let frame = 0;

    const reset = cardEl => {
        if (!cardEl) return;
        cardEl.classList.remove("is-tilting");
        const media = cardEl.querySelector(".card__media");
        if (media) {
            media.style.setProperty("--rx", "0deg");
            media.style.setProperty("--ry", "0deg");
        }
    };

    root.addEventListener("pointermove", e => {
        if (e.pointerType !== "mouse" || reduced()) return;
        const cardEl = e.target.closest(".card");
        if (cardEl !== current) {
            reset(current);
            current = cardEl;
            if (cardEl && !cardEl.style.getPropertyValue("--glow")) {
                applyGlow(cardEl, cardEl.querySelector(".card__img"));
            }
        }
        if (!cardEl) return;
        const media = cardEl.querySelector(".card__media");
        if (!media) return;
        const rect = cardEl.getBoundingClientRect();
        const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        const y = clamp((e.clientY - rect.top) / media.offsetHeight, 0, 1);
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
            cardEl.classList.add("is-tilting");
            media.style.setProperty("--ry", `${((x - 0.5) * 11).toFixed(2)}deg`);
            media.style.setProperty("--rx", `${((0.5 - y) * 11).toFixed(2)}deg`);
            media.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
            media.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
        });
    });

    root.addEventListener("pointerleave", () => {
        cancelAnimationFrame(frame);
        reset(current);
        current = null;
    });
}

/* Same idea for one big element (the poster on a title page) */
export function tiltOne(zone, target, strength = 8) {
    if (!canHover() || reduced()) return () => {};
    let frame = 0;
    const move = e => {
        const r = zone.getBoundingClientRect();
        const x = clamp((e.clientX - r.left) / r.width, 0, 1);
        const y = clamp((e.clientY - r.top) / r.height, 0, 1);
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
            target.style.setProperty("--ry", `${((x - 0.5) * strength).toFixed(2)}deg`);
            target.style.setProperty("--rx", `${((0.5 - y) * strength).toFixed(2)}deg`);
        });
    };
    const leave = () => {
        cancelAnimationFrame(frame);
        target.style.setProperty("--rx", "0deg");
        target.style.setProperty("--ry", "0deg");
    };
    zone.addEventListener("pointermove", move);
    zone.addEventListener("pointerleave", leave);
    return () => {
        zone.removeEventListener("pointermove", move);
        zone.removeEventListener("pointerleave", leave);
    };
}

/* ---------- segmented controls: the sliding highlight ---------- */

export function positionSeg(seg, animate = true) {
    const thumb = seg.querySelector(".seg__thumb");
    if (!thumb) return;
    const active = seg.querySelector('[aria-pressed="true"], [aria-current="page"]');
    if (!active || !active.offsetWidth) {
        thumb.classList.remove("is-ready");
        return;
    }
    const first = !thumb.classList.contains("is-ready") || !animate;
    if (first) thumb.style.transition = "none";
    thumb.style.setProperty("--x", `${active.offsetLeft}px`);
    thumb.style.setProperty("--w", `${active.offsetWidth}px`);
    if (first) {
        void thumb.offsetWidth;
        thumb.style.transition = "";
    }
    thumb.classList.add("is-ready");
}

export function positionAllSegs(root = document) {
    root.querySelectorAll(".seg, .mainnav").forEach(s => positionSeg(s, false));
}

export function setPressed(seg, value) {
    seg.querySelectorAll("[data-value]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.value === value)));
    positionSeg(seg);
    const active = seg.querySelector('[aria-pressed="true"]');
    if (active && seg.scrollWidth > seg.clientWidth) {
        active.scrollIntoView({ block: "nearest", inline: "center", behavior: reduced() ? "auto" : "smooth" });
    }
}

/* ---------- labels inside segmented bars: shown only when they fit ---------- */

export function fitLabels(root = document) {
    root.querySelectorAll(".share-bar__part").forEach(part => {
        const label = part.querySelector(".lbl");
        if (!label) return;
        label.classList.remove("is-hidden");
        label.classList.toggle("is-hidden", label.offsetWidth + 14 > part.clientWidth);
    });
}

/* ---------- horizontal rails ---------- */

export function rails(root) {
    root.querySelectorAll("[data-rail]").forEach(railEl => {
        const track = railEl.querySelector(".rail__track");
        const prev = railEl.querySelector(".rail__btn--prev");
        const next = railEl.querySelector(".rail__btn--next");
        if (!track) return;
        const update = () => {
            if (prev) prev.disabled = track.scrollLeft < 8;
            if (next) next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
        };
        const page = dir => track.scrollBy({ left: dir * track.clientWidth * 0.82, behavior: reduced() ? "auto" : "smooth" });
        prev?.addEventListener("click", () => page(-1));
        next?.addEventListener("click", () => page(1));
        track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
        update();
        setTimeout(update, 400);
    });
}

/* ---------- tooltip ---------- */

const tip = () => document.getElementById("tooltip");

export function showTip({ value, label = "", color = "" }, anchor) {
    const el = tip();
    if (!el) return;
    el.replaceChildren();
    const v = document.createElement("div");
    v.className = "tooltip__value";
    if (color) {
        const key = document.createElement("span");
        key.className = "tooltip__key";
        key.style.setProperty("--t", color);
        v.append(key);
    }
    v.append(document.createTextNode(value));
    el.append(v);
    if (label) {
        const l = document.createElement("div");
        l.className = "tooltip__label";
        l.textContent = label;
        el.append(l);
    }
    el.hidden = false;

    // anchor: a DOMRect-like box, or {x, y} point
    const box = anchor.width != null ? anchor : { left: anchor.x, top: anchor.y, width: 0, height: 0 };
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let x = box.left + box.width / 2 - w / 2;
    let y = box.top - h - 10;
    if (y < 8) y = box.top + box.height + 10;
    x = clamp(x, 8, window.innerWidth - w - 8);
    el.style.setProperty("--tx", `${Math.round(x)}px`);
    el.style.setProperty("--ty", `${Math.round(y)}px`);
    el.classList.add("is-on");
}

export function hideTip() {
    const el = tip();
    if (el) el.classList.remove("is-on");
}

/* Any element with data-tip-value shows a tooltip on hover and keyboard focus */
export function installTips(root) {
    const show = target => showTip({
        value: target.dataset.tipValue,
        label: target.dataset.tipLabel || "",
        color: target.dataset.tipColor || ""
    }, target.getBoundingClientRect());

    root.addEventListener("pointerover", e => {
        const t = e.target.closest("[data-tip-value]");
        if (t) show(t);
    });
    root.addEventListener("pointerout", e => {
        const t = e.target.closest("[data-tip-value]");
        if (t && !t.contains(e.relatedTarget)) hideTip();
    });
    root.addEventListener("focusin", e => {
        const t = e.target.closest("[data-tip-value]");
        if (t) show(t);
    });
    root.addEventListener("focusout", hideTip);
    window.addEventListener("scroll", hideTip, { passive: true });
}

/* ---------- toast ---------- */

let toastTimer = 0;

export function toast(message) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.querySelector("[data-toast-text]").textContent = message;
    el.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-on"), 2400);
}

/* ---------- page transitions ---------- */

function onScreen(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
}

function clearNames() {
    document.querySelectorAll("[data-vt-named]").forEach(el => {
        el.style.viewTransitionName = "";
        delete el.dataset.vtNamed;
    });
}

function name(el) {
    el.style.viewTransitionName = "poster";
    el.dataset.vtNamed = "";
}

/* Runs update() inside a view transition. If `from` is a poster on screen and
   to() finds its twin on the new page, the poster morphs between them. */
export async function transition(update, { from = null, to = null } = {}) {
    if (typeof document.startViewTransition !== "function" || reduced() || document.hidden) {
        update();
        return;
    }
    clearNames();
    const morph = onScreen(from);
    if (morph) name(from);

    let vt;
    try {
        vt = document.startViewTransition(() => {
            clearNames();
            update();
            if (morph && to) {
                const target = to();
                if (onScreen(target)) name(target);
            }
        });
    } catch {
        update();
        return;
    }
    try { await vt.finished; } catch { /* skipped transitions are fine */ }
    clearNames();
}
