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

// ---------- Senha: SHA-256 em JavaScript puro (funciona até em http:// no celular) ----------
const Senha = (function () {
  const primos = []; for (let n = 2; primos.length < 64; n++) if (primos.every(p => n % p)) primos.push(n);
  const frac = x => Math.floor((x - Math.floor(x)) * 4294967296);
  const K = primos.map(p => frac(Math.cbrt(p)));
  const H0 = primos.slice(0, 8).map(p => frac(Math.sqrt(p)));
  const ror = (x, n) => (x >>> n) | (x << (32 - n));
  function sha256(m) {
    const l = m.length, n = ((l + 9 + 63) >> 6) << 6, b = new Uint8Array(n);
    b.set(m); b[l] = 0x80;
    const dv = new DataView(b.buffer);
    dv.setUint32(n - 8, Math.floor(l * 8 / 4294967296)); dv.setUint32(n - 4, (l * 8) >>> 0);
    const h = H0.slice(), w = new Uint32Array(64);
    for (let o = 0; o < n; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = ror(w[i-15], 7) ^ ror(w[i-15], 18) ^ (w[i-15] >>> 3);
        const s1 = ror(w[i-2], 17) ^ ror(w[i-2], 19) ^ (w[i-2] >>> 10);
        w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
      }
      let [a, b2, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i++) {
        const S1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25), ch = (e & f) ^ (~e & g);
        const t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
        const S0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22), mj = (a & b2) ^ (a & c) ^ (b2 & c);
        const t2 = (S0 + mj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b2; b2 = a; a = (t1 + t2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b2) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
      h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }
    const out = new Uint8Array(32), o2 = new DataView(out.buffer);
    h.forEach((v, i) => o2.setUint32(i * 4, v >>> 0));
    return out;
  }
  const juntar = (...p) => { const r = new Uint8Array(p.reduce((a, x) => a + x.length, 0)); let o = 0; p.forEach(x => { r.set(x, o); o += x.length; }); return r; };
  const txt = s => new TextEncoder().encode(s);
  const hex = u => [...u].map(x => x.toString(16).padStart(2, "0")).join("");
  const ROUNDS = 20000;
  // Embaralha várias vezes (lento de propósito, para dificultar adivinhar a senha)
  function derivar(senha, sal, rounds) {
    const s = txt(senha); let h = sha256(juntar(sal, s));
    for (let i = 0; i < rounds; i++) h = sha256(juntar(h, sal, s));
    return h;
  }
  return {
    sha256, hex, txt,
    criar(senha) {                       // -> { s: sal, h: hash, i: voltas }
      const sal = new Uint8Array(16); (self.crypto || window.crypto).getRandomValues(sal);
      return { s: hex(sal), h: hex(derivar(senha, sal, ROUNDS)), i: ROUNDS };
    },
    confere(senha, reg) {
      if (!reg || !reg.s || !reg.h) return false;
      const sal = Uint8Array.from(reg.s.match(/../g).map(x => parseInt(x, 16)));
      const h = hex(derivar(senha, sal, reg.i || ROUNDS));
      let dif = h.length ^ reg.h.length;          // comparação sem parar no primeiro erro
      for (let i = 0; i < h.length; i++) dif |= h.charCodeAt(i) ^ (reg.h.charCodeAt(i) || 0);
      return dif === 0;
    }
  };
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

  const tentativas = {};

  window.Perfis = {
    Senha,
    AVATARES,
    lista: ler,
    ativo() { const id = idAtivo(); return ler().find(p => p.id === id) || null; },
    definirAtivo(id) { try { id ? localStorage.setItem(ATIVO, id) : localStorage.removeItem(ATIVO); } catch (e) {} },
    criar(nome, avatar, senha, dica) {
      const p = { id: "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), nome, avatar };
      if (senha) { p.senha = Senha.criar(senha); if (dica) p.dica = dica; }
      const l = ler(); l.push(p); gravar(l); return p;
    },
    // senha: undefined = mantém a atual | null = remove | texto = define uma nova
    // dica: undefined = mantém | null ou "" = apaga | texto = define
    editar(id, nome, avatar, senha, dica) {
      gravar(ler().map(p => {
        if (p.id !== id) return p;
        const n = { ...p, nome, avatar };
        if (senha === null) { delete n.senha; delete n.dica; }
        else if (typeof senha === "string" && senha) n.senha = Senha.criar(senha);
        if (n.senha && dica !== undefined) { if (dica) n.dica = dica; else delete n.dica; }
        return n;
      }));
    },
    temSenha(p) { return !!(p && p.senha); },
    // Confere a senha digitada (perfil sem senha sempre passa). Bloqueia por um tempo após muitos erros.
    verificar(id, senha) {
      const p = ler().find(x => x.id === id); if (!p || !p.senha) return { ok: true };
      const t = tentativas[id] || (tentativas[id] = { n: 0, ate: 0 });
      const resta = Math.ceil((t.ate - Date.now()) / 1000);
      if (resta > 0) return { ok: false, espere: resta };
      if (Senha.confere(senha, p.senha)) { t.n = 0; return { ok: true }; }
      if (++t.n >= 5) { t.n = 0; t.ate = Date.now() + 30000; return { ok: false, espere: 30 }; }
      return { ok: false, restam: 5 - t.n };
    },
    remover(id) {
      gravar(ler().filter(p => p.id !== id));
      if (idAtivo() === id) this.definirAtivo(null);
    },
    // Chave de armazenamento separada por perfil (recordes de cada um)
    chave(base) { const a = this.ativo(); return a ? base + "_" + a.id : base; }
  };
})();
