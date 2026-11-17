// ---------- Armazenamento em arquivo ----------
// Quando a página roda pelo servidor local (servidor.py), tudo que os jogos salvam
// no localStorage (perfis, recordes, rankings) é copiado para  dados/dados.json
// e recarregado a cada abertura. Sem o servidor, continua salvando só no navegador.
(function () {
  window.ARMAZEM_ARQUIVO = false;
  if (!/^https?:$/.test(location.protocol)) return;
  const API = "/api/dados";
  const nosso = k => /^(jogos_|ondefica_|tremBrasil_)/.test(k);
  const set = Storage.prototype.setItem, rem = Storage.prototype.removeItem;
  const snapshot = () => {
    const o = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i); if (nosso(k)) o[k] = localStorage.getItem(k);
    }
    return o;
  };
  const enviar = () => {
    try {
      fetch(API, { method: "POST", headers: { "Content-Type": "application/json" },
                   body: JSON.stringify(snapshot()), keepalive: true }).catch(() => {});
    } catch (e) {}
  };
  // 1) carrega do arquivo (sincrono, para os jogos já nascerem com os dados)
  try {
    const x = new XMLHttpRequest(); x.open("GET", API, false); x.send();
    if (x.status === 200) {
      window.ARMAZEM_ARQUIVO = true;
      const d = JSON.parse(x.responseText) || {}, chaves = Object.keys(d);
      if (chaves.length) {
        for (let i = localStorage.length - 1; i >= 0; i--) {   // o arquivo manda
          const k = localStorage.key(i); if (nosso(k)) rem.call(localStorage, k);
        }
        chaves.forEach(k => { if (nosso(k)) set.call(localStorage, k, String(d[k])); });
      } else if (Object.keys(snapshot()).length) enviar();     // 1ª vez: migra o que já existia
    }
  } catch (e) {}
  if (!window.ARMAZEM_ARQUIVO) return;
  // 2) a cada gravação, atualiza o arquivo
  let t = null;
  const agenda = () => { clearTimeout(t); t = setTimeout(() => { t = null; enviar(); }, 120); };
  Storage.prototype.setItem = function (k, v) { set.call(this, k, v); if (this === localStorage && nosso(k)) agenda(); };
  Storage.prototype.removeItem = function (k) { rem.call(this, k); if (this === localStorage && nosso(k)) agenda(); };
  addEventListener("pagehide", () => { if (t) { clearTimeout(t); t = null; enviar(); } });
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
