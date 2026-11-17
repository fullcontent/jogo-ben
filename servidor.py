"""Servidor local da Sala de Jogos.

- Serve os jogos desta pasta em http://localhost:PORTA (e no celular, pelo IP da rede)
- Guarda perfis e recordes no arquivo  dados/dados.json  (sobrevive a qualquer limpeza do navegador)

Uso:  python servidor.py [porta]      (padrao: 8765)
"""
import http.server, json, os, shutil, sys, threading, webbrowser

RAIZ = os.path.dirname(os.path.abspath(__file__))
PASTA_DADOS = os.path.join(RAIZ, "dados")
ARQ = os.path.join(PASTA_DADOS, "dados.json")
BKP = os.path.join(PASTA_DADOS, "dados.backup.json")
PORTA = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 8765
ABRIR = "--sem-navegador" not in sys.argv
trava = threading.Lock()


def ler():
    try:
        with open(ARQ, encoding="utf-8") as f:
            d = json.load(f)
            return d if isinstance(d, dict) else {}
    except (OSError, ValueError):
        return {}


def gravar_sem_trava(dados):
    os.makedirs(PASTA_DADOS, exist_ok=True)
    if os.path.exists(ARQ):
        shutil.copyfile(ARQ, BKP)              # copia de seguranca da versao anterior
    tmp = ARQ + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)
    os.replace(tmp, ARQ)                       # troca atomica: nunca fica pela metade


def juntar(chave, atual, novo):
    """Junta o valor novo com o que ja esta salvo (varios aparelhos jogando)."""
    if atual is None:
        return novo
    try:
        if chave.startswith("ondefica_best_"):
            return str(max(float(atual or 0), float(novo or 0)).__int__())
        if chave == "tremBrasil_ranking":
            vistos, todas = set(), []
            for e in json.loads(atual) + json.loads(novo):
                k = "%s|%s" % (e.get("t"), e.get("nome"))
                if k not in vistos:
                    vistos.add(k); todas.append(e)
            todas.sort(key=lambda e: e.get("t", 0), reverse=True)
            return json.dumps(todas[:600], ensure_ascii=False)
    except (ValueError, TypeError, AttributeError):
        pass
    return novo


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=RAIZ, **k)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *a):
        pass

    def _json(self, codigo, obj):
        corpo = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def do_GET(self):
        if self.path.split("?")[0] == "/api/dados":
            with trava:
                d = ler()
            return self._json(200, d)
        super().do_GET()

    def do_POST(self):
        if self.path.split("?")[0] != "/api/dados":
            return self._json(404, {"erro": "nao encontrado"})
        try:
            n = int(self.headers.get("Content-Length", 0))
            if n > 5_000_000:
                return self._json(413, {"erro": "grande demais"})
            corpo = json.loads(self.rfile.read(n).decode("utf-8"))
            if not isinstance(corpo, dict):
                raise ValueError("esperado um objeto")
            with trava:
                atual = ler()
                if corpo.get("_patch") is True:            # formato novo: so o que mudou
                    for k in corpo.get("del") or []:
                        atual.pop(k, None)
                    mesclado = {}
                    for k, v in (corpo.get("set") or {}).items():
                        if isinstance(v, str):
                            atual[k] = juntar(k, atual.get(k), v)
                            mesclado[k] = atual[k]
                    gravar_sem_trava(atual)
                    return self._json(200, {"ok": True, "merged": mesclado})
                gravar_sem_trava(corpo)                    # formato antigo: substitui tudo
            self._json(200, {"ok": True})
        except (ValueError, OSError) as e:
            self._json(400, {"erro": str(e)})

    do_PUT = do_POST


def ip_da_rede():
    """Endereco deste computador na rede Wi-Fi/cabo (para abrir no celular)."""
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))      # nao envia nada, so descobre a rota
        return s.getsockname()[0]
    except OSError:
        return None
    finally:
        s.close()


def main():
    url = "http://localhost:%d/" % PORTA
    try:
        srv = http.server.ThreadingHTTPServer(("0.0.0.0", PORTA), Handler)
    except OSError:
        print("A porta %d ja esta em uso - provavelmente o servidor ja esta aberto." % PORTA)
        print("Abrindo", url)
        if ABRIR:
            webbrowser.open(url)
        return
    print("=" * 50)
    print(" Sala de Jogos rodando em", url)
    ip = ip_da_rede()
    if ip:
        print(" No CELULAR (mesmo Wi-Fi): http://%s:%d/" % (ip, PORTA))
    print(" Dados salvos em:", ARQ)
    print(" Deixe esta janela aberta enquanto joga.")
    print(" Para fechar o servidor: Ctrl+C ou feche a janela.")
    print("=" * 50)
    if ABRIR:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
