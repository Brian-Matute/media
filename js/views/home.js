/* =========================================================
   Home: poster-wall hero, Top 10, spotlight, recent,
   best of each decade, collections, tier snapshot.
   ========================================================= */

import { average, KINDS } from "../data.js";
import { esc, icon, img, card, tierBadge, rail, sectionHead, plural, fmtYear, collCard, tierShare } from "../ui.js";
import { applyGlow, settleImages, canHover, reduced } from "../fx.js";

function shuffle(list) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function byRating(a, b) {
    return (b.rating ?? -1) - (a.rating ?? -1) || a.order - b.order;
}

/* ---------- hero ---------- */

function posterWall(items) {
    const ROWS = 4;
    const PER_ROW = 7;
    const favorites = shuffle(items.filter(i => i.images && (i.tier === "S" || i.tier === "A")));
    const others = shuffle(items.filter(i => i.images && !(i.tier === "S" || i.tier === "A")));
    const pool = [...favorites, ...others];
    if (!pool.length) return "";
    const speeds = [150, 118, 168, 132];

    return Array.from({ length: ROWS }, (_, r) => {
        const row = Array.from({ length: PER_ROW }, (_, k) => pool[(r * PER_ROW + k) % pool.length]);
        const set = row.map(i => `<div class="wall-poster">${img(i, "thumb", { eager: true })}</div>`).join("");
        // three copies so the loop never shows a gap at any screen width
        return `<div class="wall-row"><div class="wall-track" style="--dur:${speeds[r]}s">${set}${set}${set}</div></div>`;
    }).join("");
}

function hero(items) {
    const count = kind => items.filter(i => i.kind === kind).length;
    const avg = average(items);
    const stats = [
        ["Movies", count("movie"), 0],
        ["Shows", count("show"), 0],
        ...(count("game") ? [["Games", count("game"), 0]] : []),
        ["Average score", avg != null ? Number(avg.toFixed(1)) : null, 1],
        ["S-tier picks", items.filter(i => i.tier === "S").length, 0]
    ].filter(s => s[1] != null);

    return `
    <section class="hero" aria-labelledby="hero-title">
        <div class="hero__wall" aria-hidden="true"><div class="hero__wall-inner">${posterWall(items)}</div></div>
        <div class="hero__shade" aria-hidden="true"></div>
        <div class="hero__aurora" aria-hidden="true">
            <span class="blob blob--1"></span><span class="blob blob--2"></span><span class="blob blob--3"></span><span class="blob blob--4"></span>
        </div>
        <div class="hero__content">
            <img class="hero__sig" src="images/brand/signature-gradient.svg" alt="" width="132" height="98">
            <h1 class="hero__title" id="hero-title">
                <span class="line"><span>Brian's</span></span>
                <span class="line"><span class="grad-text">Media Archive</span></span>
            </h1>
            <p class="hero__tagline fade-up" style="--d:.6s">Movies, shows, games, and stories <span class="serif-accent">worth remembering.</span></p>
            <div class="hero__ctas fade-up" style="--d:.72s">
                <a class="btn btn--primary" href="./?view=library">${icon("library")}Browse the library</a>
                <a class="btn btn--ghost" href="./?view=tiers">${icon("tiers")}See the tier list</a>
            </div>
            <dl class="hero__stats fade-up" style="--d:.84s">
                ${stats.map(([label, value, decimals]) => `
                <div><dt>${label}</dt><dd data-count="${value}" data-decimals="${decimals}">${decimals ? value.toFixed(decimals) : value.toLocaleString()}</dd></div>`).join("")}
            </dl>
        </div>
    </section>`;
}

/* ---------- spotlight ---------- */

function spotlightLine(item) {
    if (item.review) return esc(item.review.length > 220 ? `${item.review.slice(0, 217).trimEnd()}…` : item.review);
    if (item.rating == null) return "";
    const kind = KINDS[item.kind].plural.toLowerCase();
    if (item.percentile >= 99) return `Rated ${esc(item.rating)}, tied for the top spot among the ${kind} in the archive.`;
    return `Rated ${esc(item.rating)}, higher than ${item.percentile}% of the ${kind} in the archive.`;
}

function spotlightInner(item) {
    const meta = [fmtYear(item.year), KINDS[item.kind].label, esc(item.creator)].filter(Boolean).join(" · ");
    return `
    <a class="spotlight__poster${item.kind === "game" ? " is-game" : ""}" id="spot-poster" href="${item.href}" data-key="${esc(item.key)}" data-morph tabindex="-1" aria-hidden="true">${img(item, "large")}</a>
    <div class="spotlight__text">
        <p class="eyebrow eyebrow--brand">${icon("sparkles")}Spotlight</p>
        <h2 class="spotlight__title">${esc(item.title)}</h2>
        <p class="spotlight__meta">${meta}</p>
        <div class="spotlight__verdict">
            ${tierBadge(item.tier, "lg")}
            ${item.rating != null ? `<div class="spotlight__score">${esc(item.rating)}<small> / 100</small></div>` : ""}
        </div>
        <p class="spotlight__quote">${spotlightLine(item)}</p>
        <div class="spotlight__actions">
            <a class="btn btn--primary" href="${item.href}" data-morph-from="#spot-poster">View details${icon("arrowRight")}</a>
            <button class="btn btn--ghost" type="button" data-shuffle>${icon("dice")}Shuffle</button>
        </div>
    </div>`;
}

/* ---------- best of each decade ---------- */

function decadeChampions(items) {
    const best = new Map();
    items.forEach(i => {
        if (i.decade == null || i.rating == null) return;
        const cur = best.get(i.decade);
        if (!cur || byRating(i, cur) < 0) best.set(i.decade, i);
    });
    return [...best.entries()].sort((a, b) => a[0] - b[0]);
}

/* ---------- view ---------- */

export default function home(route, archive) {
    const { items, collections } = archive;

    const top10 = [...items].filter(i => i.rating != null).sort(byRating).slice(0, 10);
    const recent = [...items].sort((a, b) => b.order - a.order).slice(0, 14);
    const spotPool = items.filter(i => i.images && (i.tier === "S" || i.tier === "A"));
    const spotPick = spotPool.length ? spotPool[Math.floor(Math.random() * spotPool.length)] : null;
    const decades = decadeChampions(items);
    const sCount = items.filter(i => i.tier === "S").length;
    const featured = collections.curated.slice(0, 10);

    const html = `
    ${hero(items)}

    ${top10.length ? `
    <section class="section top10" data-reveal>
        ${sectionHead({ eyebrow: "All-time", eyebrowIcon: "trophy", title: "The Top 10", sub: "The highest-rated titles in the archive.", href: "./?view=library&sort=ratingHigh", linkText: "Full ranking" })}
        ${rail(top10.map((it, i) => `
            <div class="topcard${i === 9 ? " is-ten" : ""}">
                <span class="topcard__num" aria-hidden="true">${i + 1}</span>
                ${card(it, { i })}
            </div>`).join(""))}
    </section>` : ""}

    ${spotPick ? `
    <section class="section" data-reveal>
        <div class="spotlight" id="spotlight">
            <div class="spotlight__bg" aria-hidden="true">${img(spotPick, "thumb")}</div>
            <div class="spotlight__inner">${spotlightInner(spotPick)}</div>
        </div>
    </section>` : ""}

    <section class="section" data-reveal>
        ${sectionHead({ eyebrow: "Fresh", eyebrowIcon: "clock", title: "Recently logged", sub: "The newest additions to the archive.", href: "./?view=library&sort=recent", linkText: "Everything new" })}
        ${rail(recent.map((it, i) => card(it, { i })).join(""))}
    </section>

    ${decades.length > 1 ? `
    <section class="section decades" data-reveal>
        ${sectionHead({ eyebrow: "Through the years", eyebrowIcon: "calendar", title: "Best of each decade", sub: "The top-rated title from every decade in the archive.", href: "./?view=library&sort=yearOld", linkText: "Browse by year" })}
        ${rail(decades.map(([decade, it]) => `
            <a class="decade-card" href="${it.href}" data-key="${esc(it.key)}">
                <span class="decade-card__img" data-morph>${img(it, "thumb")}</span>
                <span>
                    <span class="decade-card__year grad-text">${decade}s</span>
                    <span class="decade-card__title">${esc(it.title)}</span>
                    <span class="decade-card__meta">${tierBadge(it.tier, "sm")}${esc(it.rating)} · ${fmtYear(it.year)}</span>
                </span>
            </a>`).join(""))}
    </section>` : ""}

    ${featured.length ? `
    <section class="section coll-rail" data-reveal>
        ${sectionHead({ eyebrow: "Collections", eyebrowIcon: "stack", title: "Franchises, ranked", sub: "Every series in the archive, from best to worst.", href: "./?view=collections", linkText: "All collections" })}
        ${rail(featured.map((c, i) => collCard(c, { i })).join(""))}
    </section>` : ""}

    <section class="section" data-reveal>
        <div class="snapshot">
            <div>
                <p class="eyebrow eyebrow--brand">${icon("tiers")}The shape of it</p>
                <h2 class="snapshot__title">${plural(sCount, "S-tier pick")} out of ${items.length.toLocaleString()}</h2>
                <p class="snapshot__text">Every title gets a tier from S down to F. Here's how the whole archive spreads out.</p>
                <div style="margin-top:22px">${tierShare(items)}</div>
            </div>
            <div class="snapshot__actions">
                <a class="btn btn--primary" href="./?view=tiers">${icon("tiers")}Open the tier list</a>
                <a class="btn btn--ghost" href="./?view=stats">${icon("chart")}See all the stats</a>
            </div>
        </div>
    </section>`;

    function mount(root) {
        const cleanups = [];

        // Spotlight: glow from the poster, shuffle to another pick
        const spot = root.querySelector("#spotlight");
        if (spot && spotPick) {
            let currentKey = spotPick.key;
            applyGlow(spot, spot.querySelector(".spotlight__poster img"));
            spot.addEventListener("click", e => {
                const btn = e.target.closest("[data-shuffle]");
                if (!btn || spotPool.length < 2) return;
                let next = spotPick;
                while (next.key === currentKey) next = spotPool[Math.floor(Math.random() * spotPool.length)];
                currentKey = next.key;
                const inner = spot.querySelector(".spotlight__inner");
                inner.innerHTML = spotlightInner(next);
                inner.classList.remove("spotlight__swap");
                void inner.offsetWidth;
                inner.classList.add("spotlight__swap");
                spot.querySelector(".spotlight__bg").innerHTML = img(next, "thumb");
                settleImages(spot);
                applyGlow(spot, spot.querySelector(".spotlight__poster img"));
                const again = spot.querySelector("[data-shuffle]");
                again.classList.add("dice-spin");
                again.focus({ preventScroll: true });
            });
        }

        // Collection cards glow in their best poster's color
        root.querySelectorAll(".coll-card").forEach(c => {
            c.addEventListener("pointerenter", () => applyGlow(c, c.querySelector(".fan-img:nth-child(2) img") || c.querySelector("img")), { once: true });
        });

        // Poster wall drifts with the pointer and the scroll
        const heroEl = root.querySelector(".hero");
        const wallEl = root.querySelector(".hero__wall");
        if (heroEl && wallEl && !reduced()) {
            let frame = 0;
            if (canHover()) {
                const move = e => {
                    const r = heroEl.getBoundingClientRect();
                    const x = (e.clientX - r.left) / r.width - 0.5;
                    const y = (e.clientY - r.top) / r.height - 0.5;
                    cancelAnimationFrame(frame);
                    frame = requestAnimationFrame(() => {
                        wallEl.style.setProperty("--px", `${(-x * 34).toFixed(1)}px`);
                        wallEl.style.setProperty("--py", `${(-y * 22).toFixed(1)}px`);
                    });
                };
                heroEl.addEventListener("pointermove", move);
                cleanups.push(() => heroEl.removeEventListener("pointermove", move));
            }
            let scrollFrame = 0;
            const onScroll = () => {
                cancelAnimationFrame(scrollFrame);
                scrollFrame = requestAnimationFrame(() => {
                    const y = Math.min(window.scrollY, 1200);
                    wallEl.style.translate = `0 ${(y * 0.28).toFixed(1)}px`;
                });
            };
            window.addEventListener("scroll", onScroll, { passive: true });
            cleanups.push(() => window.removeEventListener("scroll", onScroll));
        }

        return () => cleanups.forEach(fn => fn());
    }

    return { title: "", html, mount };
}
