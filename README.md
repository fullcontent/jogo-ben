# 🎮 Sala de Jogos

Uma sala de jogos de geografia para jogar no computador ou no celular, feita em HTML, CSS e JavaScript puros (sem frameworks). Tem perfis de jogador com figurinha e senha opcional, recordes por jogador e tudo salvo num servidor online.

**Jogar:** https://jogo-ben.vercel.app

## Os jogos

### 🌍 Onde fica?
O jogo diz o nome de um país e você clica nele no mapa-múndi.

| Modo | Como funciona |
|------|---------------|
| 😀 **Fácil** | Os 30 maiores países, mapa colorido por continente com os nomes escritos, a pergunta diz o continente e você tem 3 tentativas. |
| 🤔 **Médio** | Os 100 maiores países. |
| 🥵 **Difícil** | Todos os 172 países, até os pequenos. |
| ⏱ **Contra o relógio** | 60 segundos para achar o máximo de países. Errar custa 3 s e pular custa 5 s. |
| 🔍 **Explorar** | Sem pontos: passe o mouse ou toque nos países para ver o nome e o continente. |

- 10 perguntas por rodada, pontos com bônus de sequência de acertos 🔥 e dica que reduz os pontos.
- Mais de 50 mensagens engraçadas para acertos, erros, dicas e pulos.
- Mapa com zoom (roda do mouse, botões ou pinça) e cores harmoniosas, em que países vizinhos nunca têm a mesma cor.
- Mapa desenhado com [D3](https://d3js.org/) e dados do [world-atlas](https://github.com/topojson/world-atlas), tudo incluído na pasta `lib/` (funciona offline).

### 🚂 Trem do Brasil
Dirija o trenzinho pelo mapa do Brasil e pare na estação certa. Cada acerto ganha um vagão!

- Modos: **Capitais**, **Estados**, **Regiões** e **Desafio misto**.
- Parar na estação errada, bater na borda ou nos próprios vagões termina a viagem.
- Ranking por modo, mostrando só a melhor partida de cada jogador.

## 👤 Perfis

Na aba **Perfis** da Sala de Jogos cada pessoa cria o seu perfil com **nome** e uma **figurinha** (24 opções).

- **Senha opcional (🔒):** com senha, é preciso digitá-la para **usar**, **editar** e **apagar** o perfil. Dá para definir uma dica que aparece se a pessoa errar.
- Após 5 erros seguidos, o perfil fica bloqueado por 30 segundos.
- A senha nunca é guardada: só um código embaralhado (SHA-256 com sal aleatório e 20 mil voltas).
- Os recordes do mapa são guardados separadamente para cada perfil, e o nome do perfil entra no ranking do Trem.

> **Importante sobre a segurança:** a senha é uma trava para o dia a dia (irmãos, amigos, colegas), não uma proteção forte. A verificação acontece no navegador, e os dados ficam num armazenamento que o próprio jogo lê. Quem souber mexer nas ferramentas do navegador consegue contornar. **Não use uma senha que você usa em outros lugares.** Se alguém esquecer a senha, o perfil só pode ser liberado mexendo diretamente nos dados.

## 📱 Celular

- Setas na tela e botão de pausa no Trem, e também dá para **deslizar o dedo** para dirigir.
- Com o celular em pé, o mapa do _Onde fica?_ gira sozinho para usar a tela toda (botão 🔄 desliga).
- Menus em tela cheia, botões grandes e trem um pouco mais devagar no toque.

## ☁️ Onde os dados ficam

Perfis, recordes e rankings são enviados a um servidor e carregados de lá a cada abertura. Assim aparecem em qualquer aparelho.

| Onde você abre | Onde salva |
|----------------|------------|
| Site publicado (Vercel) | Armazenamento privado **Vercel Blob**, pela função `api/dados.js` |
| Computador, com `iniciar.bat` | Arquivo local `dados/dados.json`, pelo `servidor.py` |
| Abrindo os `.html` direto | Só no navegador (`localStorage`) |

Quando vários aparelhos jogam ao mesmo tempo, os dados são **juntados** em vez de sobrescritos: o ranking do Trem soma as partidas de todos, o recorde do mapa fica com o maior valor, e o perfil "ativo" (quem está jogando agora) fica só em cada aparelho.

## ▶️ Rodar no computador

Precisa do [Python 3](https://www.python.org/downloads/) instalado (só biblioteca padrão, sem `pip install`).

1. Dê dois cliques em **`iniciar.bat`** (ou rode `python servidor.py`).
2. O navegador abre em `http://localhost:8765`. Deixe a janela preta aberta enquanto joga.
3. Para jogar no **celular** (mesmo Wi-Fi), use o endereço que aparece na janela, na linha "No CELULAR". Se não abrir, permita o Python no Firewall do Windows, em redes privadas.

## 🚀 Publicar na Vercel

```bash
npm install                       # instala @vercel/blob
vercel blob create-store jogo-ben-dados --access private
vercel deploy --prod
```

O armazenamento Blob precisa estar ligado ao projeto (a variável `BLOB_READ_WRITE_TOKEN` é criada automaticamente).

## 🗂 Estrutura

```
index.html            Sala de Jogos (abas Jogos e Perfis)
mapa.html             Jogo "Onde fica?"
trem_do_brasil.html   Jogo "Trem do Brasil"
lib/perfis.js         Perfis, senha (SHA-256) e sincronização com o servidor
lib/d3.min.js         D3 (mapa e zoom)
lib/topojson-client.min.js
lib/world.js          Dados do mapa-múndi
api/dados.js          Servidor de dados na Vercel (Blob)
servidor.py           Servidor local (arquivos + dados em dados/dados.json)
iniciar.bat           Atalho para abrir o servidor local
```

## 🛠 Tecnologias

HTML, CSS e JavaScript puros · D3 e TopoJSON · Python (servidor local) · Vercel Functions e Vercel Blob.

## 📄 Créditos

Mapa-múndi: [world-atlas](https://github.com/topojson/world-atlas) (dados do [Natural Earth](https://www.naturalearthdata.com/), domínio público).
