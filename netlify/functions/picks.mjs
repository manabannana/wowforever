// Stores everyone's picks in Netlify Blobs.
// GET  /api/picks  -> list of every hero's picks
// PUT  /api/picks  -> save your own picks (body: {id, key, name, classes})
// Each browser makes a random id + secret key. The key's hash is stored with the picks,
// so only the browser that created an entry can change it.
import { getStore } from "@netlify/blobs";

const CLASSES = {
  Warrior: { races: ["Human", "Dwarf", "Night Elf", "Gnome", "Skyborne"], roles: ["tank", "dps"] },
  Paladin: { races: ["Human", "Dwarf"], roles: ["tank", "heal", "dps"] },
  Hunter:  { races: ["Human", "Dwarf", "Night Elf", "Skyborne"], roles: ["dps"] },
  Rogue:   { races: ["Human", "Dwarf", "Night Elf", "Gnome", "Skyborne"], roles: ["dps"] },
  Priest:  { races: ["Human", "Dwarf", "Night Elf", "Gnome"], roles: ["heal", "dps"] },
  Shaman:  { races: ["Dwarf"], roles: ["heal", "dps"] },
  Mage:    { races: ["Human", "Gnome", "Skyborne"], roles: ["dps"] },
  Warlock: { races: ["Human", "Gnome"], roles: ["dps"] },
  Druid:   { races: ["Night Elf", "Skyborne"], roles: ["tank", "heal", "dps"] },
};
const MAX_HEROES = 60;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

async function sha256(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Keep only real classes, races and roles so nobody can stuff junk into the store
function cleanClasses(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [cls, def] of Object.entries(CLASSES)) {
    const pick = raw[cls];
    if (!pick || typeof pick !== "object") continue;
    const races = Array.isArray(pick.races) ? [...new Set(pick.races)].filter((r) => def.races.includes(r)) : [];
    const roles = Array.isArray(pick.roles) ? [...new Set(pick.roles)].filter((r) => def.roles.includes(r)) : [];
    out[cls] = { races, roles };
  }
  return out;
}

export default async (req) => {
  const store = getStore({ name: "wow-forever-picks", consistency: "strong" });

  if (req.method === "GET") {
    const { blobs } = await store.list();
    const rows = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
    return json(
      rows.filter(Boolean).map(({ id, name, classes, updatedAt }) => ({ id, name, classes, updatedAt }))
    );
  }

  if (req.method === "PUT") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "Body must be JSON" }, 400); }

    const { id, key } = body || {};
    if (typeof id !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(id))
      return json({ error: "Bad id" }, 400);
    if (typeof key !== "string" || key.length < 16 || key.length > 128)
      return json({ error: "Bad key" }, 400);

    const name = String(body.name ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 24);
    const classes = cleanClasses(body.classes);
    const keyHash = await sha256(key);

    const existing = await store.get(id, { type: "json" });
    if (existing && existing.keyHash !== keyHash) return json({ error: "That entry belongs to someone else" }, 403);
    if (!existing) {
      const { blobs } = await store.list();
      if (blobs.length >= MAX_HEROES) return json({ error: "Roster is full" }, 429);
    }

    await store.setJSON(id, { id, name, classes, updatedAt: new Date().toISOString(), keyHash });
    return json({ ok: true });
  }

  return json({ error: "Use GET or PUT" }, 405);
};

export const config = { path: "/api/picks" };
