/* =========================================================
   Data: loads the JSON files and turns every entry into
   one consistent shape the rest of the site can rely on.

   data/media.json        movies + shows (your main log)
   data/games.json        games
   data/collections.json  franchises you want grouped and ranked
   ========================================================= */

export const TIERS = ["S", "A", "B", "C", "D", "F"];

export const KINDS = {
    movie: { label: "Movie", plural: "Movies", icon: "film" },
    show: { label: "Show", plural: "Shows", icon: "tv" },
    game: { label: "Game", plural: "Games", icon: "gamepad" }
};

/* ---------- small text helpers ---------- */

export function normalizeText(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

export function slugify(value) {
    return normalizeText(value).replace(/\s+/g, "-");
}

export function splitGenres(genre) {
    return String(genre || "")
        .split(/[•,\/|]/)
        .map(g => g.trim())
        .filter(Boolean);
}

export function splitPeople(people) {
    return String(people || "")
        .split(/[•,]/)
        .map(p => p.trim())
        .filter(Boolean);
}

function isRealText(text) {
    const t = String(text ?? "").trim();
    return t !== "" && t !== "/" && t !== "-" && t.toLowerCase() !== "n/a";
}

function yearRange(year) {
    const found = String(year || "").match(/\d{4}/g);
    if (!found) return null;
    const start = Number(found[0]);
    const end = found[1] ? Number(found[1]) : (/present|now|ongoing/i.test(year) ? null : start);
    return { start, end };
}

/* Poster/cover file -> the fast copies made by tools/make-thumbs.ps1, plus the original */
function imageSet(file, folder) {
    const f = String(file || "").trim();
    if (!f) return null;
    if (/^(https?:)?\/\//i.test(f) || f.includes("/")) return { thumb: f, large: f, original: f };
    const base = f.replace(/\.[^.]+$/, "");
    const enc = encodeURIComponent;
    return {
        thumb: `images/thumbs/${folder}/${enc(base)}.jpg`,
        large: `images/large/${folder}/${enc(base)}.jpg`,
        original: `images/${folder}/${enc(f)}`
    };
}

export function statusTone(status) {
    const s = String(status || "").toLowerCase();
    if (!s) return "";
    if (/complete|beaten|finished(?!\s*s\d)|100|done|caught up|platinum/.test(s)) return "done";
    if (/drop|abandon/.test(s)) return "dropped";
    if (/hold|pause|shelved/.test(s)) return "paused";
    return "progress";
}

/* ---------- normalizing one entry ---------- */

function kindOf(raw) {
    const t = String(raw.type || "").toLowerCase();
    if (t === "show" || t === "series" || t === "tv") return "show";
    if (t === "game") return "game";
    return "movie";
}

function normalize(raw, kind, order, source) {
    const isGame = kind === "game";
    const ratingText = String(raw.rating ?? "").trim();
    const ratingNum = Number(ratingText);
    const tier = String(raw.tier ?? "").trim().toUpperCase();
    const title = String(raw.title || "Untitled").trim();
    const id = String(raw.id || slugify(title) || `entry-${order}`).trim();
    const creator = String((isGame ? (raw.developer || raw.director) : raw.director) || "").trim();
    const genres = splitGenres(raw.genre);
    const years = yearRange(raw.year);
    const links = [raw.rottenTomatoes, raw.imdb, raw.letterboxd, raw.backloggd, raw.metacritic, raw.link]
        .map(u => String(u || "").trim())
        .filter(u => /^https?:\/\//i.test(u))
        .filter((u, i, all) => all.indexOf(u) === i);

    return {
        key: `${isGame ? "g" : "m"}:${id}`,
        id,
        kind,
        source,
        order,
        title,
        titleNorm: normalizeText(title),
        year: String(raw.year || "").trim(),
        yearStart: years ? years.start : null,
        decade: years ? Math.floor(years.start / 10) * 10 : null,
        rating: ratingText !== "" && Number.isFinite(ratingNum) ? ratingNum : null,
        tier: TIERS.includes(tier) ? tier : null,
        genres,
        creator,
        people: splitPeople(creator),
        images: imageSet(isGame ? (raw.cover || raw.poster) : raw.poster, isGame ? "games" : "posters"),
        status: String((isGame ? raw.status : raw.progress) || "").trim(),
        platform: String(raw.platform || "").trim(),
        hours: Number(raw.hours) || 0,
        date: String((isGame ? (raw.dateCompleted || raw.datePlayed) : raw.dateWatched) || "").trim(),
        review: isRealText(raw.review) ? String(raw.review).trim() : "",
        links,
        href: `./?${isGame ? "game" : "title"}=${encodeURIComponent(id)}`,
        haystack: normalizeText([title, creator, genres.join(" "), raw.platform, raw.year, KINDS[kind].label].join(" ")),
        raw
    };
}

/* Used by the entry builder to preview an entry that isn't saved yet */
export function previewItem(raw, kind) {
    return normalize(raw, kind, 0, kind === "game" ? "games" : "media");
}

/* ---------- collections ---------- */

function summarize(members) {
    const rated = members.filter(m => m.rating != null);
    const avg = rated.length ? rated.reduce((s, m) => s + m.rating, 0) / rated.length : null;
    return {
        count: members.length,
        avg,
        best: rated[0] || null,
        worst: rated.length ? rated[rated.length - 1] : null
    };
}

export function rankMembers(members) {
    // ties keep the order of your own list
    return [...members].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || a.order - b.order);
}

function buildCollections(defs, items) {
    const curated = defs
        .filter(d => d && d.title)
        .map(def => {
            const ids = new Set((def.ids || []).map(String));
            const matches = (def.match || []).map(normalizeText).filter(Boolean);
            const kinds = Array.isArray(def.kinds) ? new Set(def.kinds.map(k => String(k).toLowerCase())) : null;
            const members = items.filter(item => {
                if (kinds && !kinds.has(item.kind)) return false;
                if (ids.has(item.id)) return true;
                const hay = ` ${item.titleNorm} `;
                return matches.some(m => hay.includes(` ${m} `));
            });
            const ranked = rankMembers(members);
            return {
                id: String(def.id || slugify(def.title)),
                title: def.title,
                blurb: def.blurb || "",
                type: "franchise",
                members: ranked,
                ...summarize(ranked),
                href: `./?collection=${encodeURIComponent(def.id || slugify(def.title))}`
            };
        })
        .filter(c => c.count > 0);

    // Directors & creators with 3+ titles get a collection automatically.
    const byPerson = new Map();
    items.forEach(item => item.people.forEach(p => {
        if (!byPerson.has(p)) byPerson.set(p, []);
        byPerson.get(p).push(item);
    }));

    const groups = new Map();   // identical title sets (e.g. the Russo brothers) merge into one
    for (const [person, list] of byPerson) {
        if (list.length < 3) continue;
        const sig = list.map(i => i.key).sort().join("|");
        if (!groups.has(sig)) groups.set(sig, { names: [], list });
        groups.get(sig).names.push(person);
    }

    const creators = [...groups.values()].map(({ names, list }) => {
        const title = names.length > 1 ? `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}` : names[0];
        const id = `by-${slugify(title)}`;
        const ranked = rankMembers(list);
        return {
            id,
            title,
            blurb: `Everything by ${title} in the archive, ranked.`,
            type: "creator",
            members: ranked,
            ...summarize(ranked),
            href: `./?collection=${encodeURIComponent(id)}`
        };
    }).sort((a, b) => b.count - a.count || (b.avg ?? 0) - (a.avg ?? 0));

    return { curated, creators, all: [...curated, ...creators] };
}

/* ---------- loading ---------- */

async function fetchArray(url) {
    try {
        const res = await fetch(url, { cache: "no-cache" });
        if (!res.ok) return [];
        const text = await res.text();
        if (!text.trim()) return [];
        const data = JSON.parse(text);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error(`Couldn't read ${url}:`, err);
        return [];
    }
}

let archivePromise = null;

export function loadArchive() {
    if (!archivePromise) archivePromise = build();
    return archivePromise;
}

async function build() {
    const [media, games, collectionDefs] = await Promise.all([
        fetchArray("data/media.json"),
        fetchArray("data/games.json"),
        fetchArray("data/collections.json")
    ]);

    const items = [
        ...media.map((raw, i) => normalize(raw, kindOf(raw), i, "media")),
        ...games.map((raw, i) => normalize(raw, "game", media.length + i, "games"))
    ];

    // Rank and percentile within each kind
    for (const kind of Object.keys(KINDS)) {
        const rated = items.filter(i => i.kind === kind && i.rating != null);
        for (const item of rated) {
            const higher = rated.filter(o => o.rating > item.rating).length;
            const lower = rated.filter(o => o.rating < item.rating).length;
            item.rank = higher + 1;
            item.rankOf = rated.length;
            item.tied = rated.filter(o => o.rating === item.rating).length > 1;
            item.percentile = rated.length > 1 ? Math.round((lower / (rated.length - 1)) * 100) : 100;
        }
    }

    const byKey = new Map();
    items.forEach(i => { if (!byKey.has(i.key)) byKey.set(i.key, i); });

    const collections = buildCollections(collectionDefs, items);
    const memberOf = new Map();
    collections.all.forEach(c => c.members.forEach((m, idx) => {
        if (!memberOf.has(m.key)) memberOf.set(m.key, []);
        memberOf.get(m.key).push({ collection: c, position: idx + 1 });
    }));

    return { items, byKey, collections, memberOf };
}

/* ---------- shared math ---------- */

export function average(list) {
    const rated = list.filter(i => i.rating != null);
    return rated.length ? rated.reduce((s, i) => s + i.rating, 0) / rated.length : null;
}

export function median(list) {
    const r = list.filter(i => i.rating != null).map(i => i.rating).sort((a, b) => a - b);
    if (!r.length) return null;
    const mid = Math.floor(r.length / 2);
    return r.length % 2 ? r[mid] : (r[mid - 1] + r[mid]) / 2;
}

export function countBy(list, getter) {
    const counts = new Map();
    list.forEach(item => [].concat(getter(item)).filter(v => v != null && v !== "").forEach(v => {
        counts.set(v, (counts.get(v) || 0) + 1);
    }));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}

export const SORTS = {
    default: { label: "My order", fn: (a, b) => a.order - b.order },
    recent: { label: "Recently added", fn: (a, b) => b.order - a.order },
    ratingHigh: { label: "Highest rated", fn: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) || a.order - b.order },
    ratingLow: { label: "Lowest rated", fn: (a, b) => (a.rating ?? 999) - (b.rating ?? 999) || a.order - b.order },
    tier: { label: "Tier", fn: (a, b) => tierIndex(a.tier) - tierIndex(b.tier) || (b.rating ?? -1) - (a.rating ?? -1) || a.order - b.order },
    titleAZ: { label: "Title A–Z", fn: (a, b) => sortTitle(a).localeCompare(sortTitle(b)) },
    titleZA: { label: "Title Z–A", fn: (a, b) => sortTitle(b).localeCompare(sortTitle(a)) },
    yearNew: { label: "Newest release", fn: (a, b) => (b.yearStart ?? 0) - (a.yearStart ?? 0) || (b.rating ?? -1) - (a.rating ?? -1) },
    yearOld: { label: "Oldest release", fn: (a, b) => (a.yearStart ?? 9999) - (b.yearStart ?? 9999) || (b.rating ?? -1) - (a.rating ?? -1) }
};

export function tierIndex(t) {
    const i = TIERS.indexOf(t);
    return i === -1 ? 99 : i;
}

function sortTitle(item) {
    return item.titleNorm.replace(/^(the|a|an) /, "");
}

export function sortItems(list, sort) {
    return [...list].sort((SORTS[sort] || SORTS.default).fn);
}
