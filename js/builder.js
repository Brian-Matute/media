/* =========================================================
   Entry builder (add.html): turns the form into an entry
   formatted like data/media.json, with a live card preview.
   ========================================================= */

import { loadArchive, previewItem, slugify } from "./data.js";
import { esc, card, segmented } from "./ui.js";
import { installImageHandlers, installTilt, settleImages, positionSeg, setPressed, toast } from "./fx.js";

const form = document.getElementById("entryForm");
const output = document.getElementById("output");
const warning = document.getElementById("warning");
const dest = document.getElementById("dest");
const steps = document.getElementById("steps");
const copyBtn = document.getElementById("copyBtn");
const tierHint = document.getElementById("tierHint");
const preview = document.getElementById("preview");
const switchHost = document.getElementById("typeSwitch");

const fromUrl = (new URLSearchParams(location.search).get("type") || "").toLowerCase();
let type = fromUrl === "game" ? "Game" : fromUrl === "show" ? "Show" : "Movie";
let existing = [];

installImageHandlers();
installTilt(preview);

switchHost.innerHTML = segmented([
    { value: "Movie", label: "Movie" },
    { value: "Show", label: "Show" },
    { value: "Game", label: "Game" }
], type, { name: "type", label: "Entry type" });
const seg = switchHost.querySelector(".seg");

function val(name) {
    return String(form.elements[name]?.value || "").trim();
}

/* Suggest a tier from how similar scores have been tiered before */
function suggestTier(score) {
    const r = Number(score);
    if (score === "" || !Number.isFinite(r)) return "";
    const pool = existing.filter(i => i.rating != null && i.tier);
    if (!pool.length) return r >= 97 ? "S" : r >= 90 ? "A" : r >= 80 ? "B" : r >= 70 ? "C" : r >= 60 ? "D" : "F";
    for (let spread = 0; spread <= 10; spread++) {
        const near = pool.filter(i => Math.abs(i.rating - r) <= spread);
        if (near.length >= 3 || (spread >= 3 && near.length)) {
            const counts = {};
            near.forEach(i => { counts[i.tier] = (counts[i.tier] || 0) + 1; });
            return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        }
    }
    return "";
}

function buildEntry() {
    const isGame = type === "Game";
    const title = val("title");
    const link = val("link");
    const genre = val("genre").split(/[,•]/).map(g => g.trim()).filter(Boolean).join(" • ");
    const tier = val("tier") || suggestTier(val("rating"));

    // Same key order as the entries already in media.json
    const entry = { id: slugify(title), title };
    if (!isGame) entry.type = type;
    entry.year = val("year");
    entry.rating = val("rating");
    entry.tier = tier;
    entry.genre = genre;

    if (isGame) {
        entry.platform = val("platform");
        entry.developer = val("developer");
        entry.status = val("status");
        entry.hours = val("hours");
        entry.dateCompleted = val("date");
        entry.cover = val("poster");
        entry.review = val("review");
        if (link) entry.link = link;
    } else {
        entry.poster = val("poster");
        entry.director = val("director");
        if (type === "Show") entry.progress = val("progress");
        entry.dateWatched = val("date");
        entry.review = val("review");
        if (link) entry[/imdb\.com/i.test(link) ? "imdb" : "rottenTomatoes"] = link;
    }
    return entry;
}

function formatEntry(entry) {
    return `{\n${Object.entries(entry).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(",\n")}\n}`;
}

function update() {
    const isGame = type === "Game";
    const file = isGame ? "data/games.json" : "data/media.json";
    const folder = isGame ? "images/games/" : "images/posters/";

    document.querySelectorAll("[data-for]").forEach(f => { f.hidden = !f.dataset.for.split(" ").includes(type); });
    document.getElementById("l-director").textContent = type === "Show" ? "Creator" : "Director";
    document.getElementById("l-date").textContent = isGame ? "Date finished or played" : "Date watched";
    document.getElementById("l-poster").textContent = isGame ? "Cover file name" : "Poster file name";
    document.getElementById("posterHint").innerHTML = `Put the image in <code>${folder}</code>${isGame ? " (or paste a full image link)" : ""}`;
    document.getElementById("l-link").textContent = isGame ? "Link (Backloggd, Metacritic…)" : "IMDb or Rotten Tomatoes link";
    form.elements.link.placeholder = isGame ? "https://www.backloggd.com/games/…" : "https://www.imdb.com/title/…";

    const suggested = suggestTier(val("rating"));
    tierHint.textContent = !val("tier") && suggested ? `Suggested: ${suggested}, based on how you've tiered similar scores` : "";

    const genres = [...new Set(existing.filter(i => (i.kind === "game") === isGame).flatMap(i => i.genres))].sort();
    document.getElementById("genreList").innerHTML = genres.map(g => `<option value="${esc(g)}">`).join("");

    const entry = buildEntry();
    const hasEntries = existing.some(i => (isGame ? i.source === "games" : i.source === "media"));
    output.textContent = (hasEntries ? ",\n\n" : "") + formatEntry(entry);
    dest.textContent = file;

    steps.innerHTML = `
        <li>Open <code>${file}</code> in your editor.</li>
        <li>Click right before the very last <code>]</code> at the bottom and paste.${hasEntries ? " The comma in front is already included." : " It's the first one in this file, so no comma is needed."}</li>
        <li>Put the ${isGame ? "cover" : "poster"} in <code>${folder}</code> using the same file name.</li>
        <li>Optional: run <code>tools/make-thumbs.ps1</code> so the new image loads fast. The site works without it.</li>
        <li>Commit and push in GitHub Desktop.</li>`;

    const problems = [];
    if (!entry.title) problems.push("Add a title.");
    const clash = existing.find(i => i.id === entry.id && (isGame ? i.kind === "game" : i.source === "media"));
    if (entry.id && clash) problems.push(`“${clash.title}” already uses the id “${entry.id}”. Tweak the title, or change the id after pasting.`);
    const r = Number(entry.rating);
    if (entry.rating && (!Number.isFinite(r) || r < 0 || r > 100)) problems.push("The score should be a number from 0 to 100.");
    warning.hidden = !problems.length;
    warning.textContent = problems.join(" ");
    copyBtn.disabled = !entry.title;

    const kind = isGame ? "game" : type === "Show" ? "show" : "movie";
    const item = previewItem({ ...entry, title: entry.title || "Your title here", type }, kind);
    preview.innerHTML = card(item);
    settleImages(preview);
}

seg.addEventListener("click", e => {
    const b = e.target.closest("[data-value]");
    if (!b || b.dataset.value === type) return;
    type = b.dataset.value;
    setPressed(seg, type);
    history.replaceState(null, "", `?type=${type.toLowerCase()}`);
    update();
});

form.addEventListener("input", update);
form.addEventListener("change", update);
form.addEventListener("submit", e => e.preventDefault());
preview.addEventListener("click", e => e.preventDefault());

copyBtn.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(output.textContent);
        toast("Entry copied. Paste it into the file.");
    } catch {
        const range = document.createRange();
        range.selectNodeContents(output);
        getSelection().removeAllRanges();
        getSelection().addRange(range);
        toast("Selected. Press Ctrl+C to copy.");
    }
});

update();
requestAnimationFrame(() => positionSeg(seg, false));
document.fonts?.ready.then(() => positionSeg(seg, false));

loadArchive().then(data => {
    existing = data.items;
    update();
});
