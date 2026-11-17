// ---------- Armazenamento no servidor ----------
// Tudo que os jogos salvam (perfis, recordes, rankings) é enviado ao servidor (/api/dados) e
// carregado de lá a cada abertura. No site publicado o servidor é o Vercel; no computador,
// o servidor.py (arquivo dados/dados.json). Sem servidor, salva só no navegador.
// O perfil "ativo" (quem está jogando neste aparelho) fica só no aparelho.
(function () {
  window.ARMAZEM_ARQUIVO = false;
  if (!/^https?:$/.test(location.protocol)) return;
  const API = "/api/dados";
  const nosso = k => /^(jogos_|ondefica_|tremBrasil_)/.test(k) && k !== "jogos_perfil_ativo";
  const set = Storage.prototype.setItem, rem = Storage.prototype.removeItem;
  const snapshot = () => {
    const o = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i); if (nosso(k)) o[k] = localStorage.getItem(k);
    }
    return o;
  };
  let pend = { set: {}, del: new Set() }, t = null;
  const enviar = () => {
    const corpo = { _patch: true, set: pend.set, del: [...pend.del] };
    pend = { set: {}, del: new Set() };
    if (!Object.keys(corpo.set).length && !corpo.del.length) return;
    try {
      fetch(API, { method: "POST", headers: { "Content-Type": "application/json" },
                   body: JSON.stringify(corpo), keepalive: true })
        .then(r => r.json())
        .then(j => { for (const [k, v] of Object.entries(j.merged || {})) set.call(localStorage, k, v); })  // valor já unido
        .catch(() => {});
    } catch (e) {}
  };
  // 1) carrega do servidor (síncrono, para os jogos já nascerem com os dados)
  try {
    const x = new XMLHttpRequest(); x.open("GET", API, false); x.send();
    if (x.status === 200) {
      const d = JSON.parse(x.responseText);
      if (d && typeof d === "object" && !Array.isArray(d)) {
        window.ARMAZEM_ARQUIVO = true;
        const chaves = Object.keys(d).filter(nosso);
        if (chaves.length) {
          for (let i = localStorage.length - 1; i >= 0; i--) {   // o servidor manda
            const k = localStorage.key(i); if (nosso(k)) rem.call(localStorage, k);
          }
          chaves.forEach(k => set.call(localStorage, k, String(d[k])));
        } else {                                                   // 1ª vez: sobe o que já existia
          pend.set = snapshot(); if (Object.keys(pend.set).length) enviar();
        }
      }
    }
  } catch (e) {}
  if (!window.ARMAZEM_ARQUIVO) return;
  // 2) a cada gravação, atualiza o servidor
  const agenda = () => { clearTimeout(t); t = setTimeout(() => { t = null; enviar(); }, 150); };
  Storage.prototype.setItem = function (k, v) {
    set.call(this, k, v);
    if (this === localStorage && nosso(k)) { pend.set[k] = String(v); pend.del.delete(k); agenda(); }
  };
  Storage.prototype.removeItem = function (k) {
    rem.call(this, k);
    if (this === localStorage && nosso(k)) { delete pend.set[k]; pend.del.add(k); agenda(); }
  };
  addEventListener("pagehide", () => { if (t) { clearTimeout(t); t = null; } enviar(); });
})();

// ---------- Perfis de jogador (nome + avatar). Usado por todos os jogos. ----------
(function () {
  const KEY = "jogos_perfis", ATIVO = "jogos_perfil_ativo";
  const AVATARES = [
    "🦁","🐯","🐼","🦊","🐸","🐵","🐙","🦄","🐲","🦖","🐧","🦉",
    "🐬","🦈","🐶","🐱","🐰","🦕","🤖","👽","🚀","🦸","🧙","🥷"
  ];
  const ler = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const gravar = l => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} };
  const idAtivo = () => { try { return localStorage.getItem(ATIVO); } catch (e) { return null; } };

  window.Perfis = {
    AVATARES,
    lista: ler,
    ativo() { const id = idAtivo(); return ler().find(p => p.id === id) || null; },
    definirAtivo(id) { try { id ? localStorage.setItem(ATIVO, id) : localStorage.removeItem(ATIVO); } catch (e) {} },
    criar(nome, avatar) {
      const p = { id: "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), nome, avatar };
      const l = ler(); l.push(p); gravar(l); return p;
    },
    editar(id, nome, avatar) { gravar(ler().map(p => p.id === id ? { ...p, nome, avatar } : p)); },
    remover(id) {
      gravar(ler().filter(p => p.id !== id));
      if (idAtivo() === id) this.definirAtivo(null);
    },
    // Chave de armazenamento separada por perfil (recordes de cada um)
    chave(base) { const a = this.ativo(); return a ? base + "_" + a.id : base; }
  };
})();
