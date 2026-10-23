// The shared raid team. Anyone on the site can change it; the last save wins.
// GET /api/raid -> {tank:[slot|null x2], heal:[x3], dps:[x6]}
// PUT /api/raid -> save the whole team. slot = {hero, cls, race}
import { getStore } from "@netlify/blobs";
import { CLASSES } from "../lib/classes.mjs";

const SLOTS = { tank: 2, heal: 3, dps: 6 };

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

function cleanTeam(raw) {
  const out = {};
  const seen = new Set();
  for (const [role, n] of Object.entries(SLOTS)) {
    const list = raw && Array.isArray(raw[role]) ? raw[role] : [];
    out[role] = [];
    for (let i = 0; i < n; i++) {
      const s = list[i];
      const ok =
        s && typeof s === "object" &&
        typeof s.hero === "string" && /^[A-Za-z0-9-]{8,64}$/.test(s.hero) &&
        CLASSES[s.cls] && CLASSES[s.cls].roles.includes(role) &&
        CLASSES[s.cls].races.includes(s.race) &&
        !seen.has(s.hero);
      if (ok) seen.add(s.hero);
      out[role].push(ok ? { hero: s.hero, cls: s.cls, race: s.race } : null);
    }
  }
  return out;
}

export default async (req) => {
  const store = getStore({ name: "wow-forever-raid", consistency: "strong" });

  if (req.method === "GET") {
    const team = await store.get("team", { type: "json" });
    return json(cleanTeam(team));
  }

  if (req.method === "PUT") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "Body must be JSON" }, 400); }
    const team = cleanTeam(body);
    await store.setJSON("team", { ...team, updatedAt: new Date().toISOString() });
    return json({ ok: true });
  }

  return json({ error: "Use GET or PUT" }, 405);
};

export const config = { path: "/api/raid" };
