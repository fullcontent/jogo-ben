// Servidor de dados dos jogos (Vercel). Guarda perfis e recordes num Blob privado.
// GET  /api/dados  -> { chave: valor, ... }
// POST /api/dados  -> { _patch: true, set: {chave: valor}, del: [chave] }  (junta com o que já existe)
const { get, put } = require("@vercel/blob");

const ARQ = "dados/dados.json";
const CHAVE_OK = /^(jogos_|ondefica_|tremBrasil_)[A-Za-z0-9_\-]{0,80}$/;
const MAX_VALOR = 300 * 1024, MAX_TOTAL = 1024 * 1024;

async function ler() {
  const r = await get(ARQ, { access: "private", useCache: false });
  if (!r || r.statusCode !== 200) return {};
  try {
    const d = JSON.parse(await new Response(r.stream).text());
    return d && typeof d === "object" && !Array.isArray(d) ? d : {};
  } catch (e) { return {}; }
}

// Junta o valor novo com o que já está no servidor (vários aparelhos jogando)
function juntar(chave, atual, novo) {
  if (atual === undefined) return novo;
  try {
    if (chave.startsWith("ondefica_best_")) return String(Math.max(+atual || 0, +novo || 0));
    if (chave === "tremBrasil_ranking") {           // une as partidas de todos, sem repetir
      const a = JSON.parse(atual) || [], b = JSON.parse(novo) || [];
      const vistos = new Set(), todas = [];
      [...a, ...b].forEach(e => { const k = e.t + "|" + e.nome; if (!vistos.has(k)) { vistos.add(k); todas.push(e); } });
      todas.sort((x, y) => (y.t || 0) - (x.t || 0));
      return JSON.stringify(todas.slice(0, 600));
    }
  } catch (e) {}
  return novo;                                      // perfis etc.: vale o mais recente
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") return res.status(200).json(await ler());
    if (req.method !== "POST" && req.method !== "PUT") return res.status(405).json({ erro: "método não permitido" });

    const p = req.body;
    if (!p || typeof p !== "object" || p._patch !== true) return res.status(400).json({ erro: "formato inválido" });
    const cur = await ler(), merged = {};
    for (const k of Array.isArray(p.del) ? p.del : []) if (CHAVE_OK.test(k)) delete cur[k];
    for (const [k, v] of Object.entries(p.set && typeof p.set === "object" ? p.set : {})) {
      if (!CHAVE_OK.test(k) || typeof v !== "string" || v.length > MAX_VALOR) continue;
      cur[k] = juntar(k, cur[k], v); merged[k] = cur[k];
    }
    const texto = JSON.stringify(cur);
    if (texto.length > MAX_TOTAL) return res.status(413).json({ erro: "dados grandes demais" });
    await put(ARQ, texto, { access: "private", allowOverwrite: true, addRandomSuffix: false,
                            contentType: "application/json", cacheControlMaxAge: 60 });
    return res.status(200).json({ ok: true, merged });
  } catch (e) {
    return res.status(500).json({ erro: "falha no servidor" });
  }
};
