# Proz CTF — Loja Vulnerável + Plataforma de Equipes

> ⚠️ **AVISO DE CONFIDENCIALIDADE:** Este repositório deve permanecer PRIVADO. Contém o gabarito do CTF.

Ambiente educacional de segurança digital desenvolvido para a **Escola Técnica Proz**. O sistema é dividido em dois módulos tecnicamente isolados no banco de dados:

1. **Plataforma CTF (`/ctf` — banco `platform`):** Ambiente seguro onde os alunos se cadastram, criam ou entram em equipes via código de convite (`inviteCode`), consultam os 17 desafios, enviam as flags encontradas (com rate limit de 1 tentativa a cada 3s) e acompanham o placar ao vivo. Inclui Painel Admin completo para o instrutor (`/ctf/admin`).
2. **Proz Store (`/loja` — banco `shop`):** E-commerce fictício de tecnologia contendo **17 vulnerabilidades propositais e controladas**, exploráveis exclusivamente pelo navegador e DevTools (`F12`), sem necessidade de ferramentas externas.

---

## 1. Pré-requisitos

- **Modo Recomendado — Containerizado via Docker Compose (Notebook Debian Offline):**
  - **Docker Engine** 24+ e **Docker Compose Plugin** (`docker compose`)
  - 4 containers isolados (`platform`, `shop`, `platform-db`, `shop-db`) em duas redes independentes (`platform-net` e `shop-net`), com PostgreSQL 16 sem portas expostas ao host e container da Loja endurecido (`read_only: true`, `cap_drop: [ALL]`, `no-new-privileges`, limites de CPU/RAM).
  - Funciona **100% offline** em sala de aula após o build inicial das imagens (imagens dos 18 produtos em SVG local `/produtos/*.svg` e motor do ProzBot local).
- **Modo Alternativo — Execução Direta no Host (Node.js):**
  - **Node.js** 18+ (recomendado Node 20+) e PostgreSQL.

---

## 2. Como Executar via Docker Compose (Notebook Debian — 100% Offline)

### Passo 1 — Preparação Inicial (Antes da Aula / Com Internet para Baixar Imagens Base)
No notebook Debian, dentro da pasta do projeto:

```bash
# 1. Garanta permissão de execução nos scripts de operação e entrypoint
chmod +x gerar-env.sh docker-entrypoint.sh reset.sh backup.sh

# 2. Gere o arquivo .env (com permissão 600) contendo segredos novos e aleatórios
#    para os dois bancos PostgreSQL, sessão da Plataforma e derivação das flags:
./gerar-env.sh

# 3. Construa as imagens multi-stage (platform e shop) e suba os 4 serviços
docker compose up -d --build
```

> **Operação 100% Offline na Sala de Aula:** Depois que `docker compose up -d --build` tiver sido executado uma vez, as imagens `postgres:16-bookworm`, `proz-ctf-platform:latest` e `proz-ctf-shop:latest` ficam armazenadas localmente no Docker do notebook Debian. Na sala de aula (sem internet), `docker compose up -d` e `./reset.sh` sobem tudo localmente sem qualquer tráfego externo.

### Passo 2 — O que acontece automaticamente na primeira subida
1. **`platform-db` e `shop-db`** iniciam em suas próprias redes (`platform-net` e `shop-net`) sem expor a porta `5432` ao host e aguardam validação do `healthcheck` (`pg_isready`).
2. **`platform` e `shop`** aguardam seus respectivos bancos ficarem saudáveis (`condition: service_healthy`) e executam o `/app/docker-entrypoint.sh`:
   - Aplicam as migrations SQL via `prisma migrate deploy`;
   - Detectam que o banco está vazio (`--if-empty`) e executam o `seed` inicial sincronizando as 17 flags dinâmicas;
   - No container `shop`, variáveis de seed são removidas da memória (`unset CTF_FLAG_SECRET`) antes de iniciar o servidor `node server.js`.

### Passo 3 — Consultar a Senha do Instrutor e o Gabarito (`FLAGS_REAIS.txt`)
Para extrair o arquivo `FLAGS_REAIS.txt` gerado dentro do container `platform` (ou consultar direto nos logs):

```bash
# Copiar o gabarito para a pasta atual com permissão restrita ao instrutor:
docker compose cp platform:/app/FLAGS_REAIS.txt ./FLAGS_REAIS.txt
chmod 600 ./FLAGS_REAIS.txt
cat ./FLAGS_REAIS.txt

# Ou visualizar diretamente pelos logs do container platform:
docker compose logs platform
```

### Passo 4 — Acesso dos ~30 Alunos na Rede Local (LAN) do Notebook Debian
1. Descubra o IP do notebook Debian na rede local da sala de aula:
   ```bash
   ip -4 addr show | grep inet
   ```
   *(Exemplo de IP na LAN: `192.168.1.50`)*
2. Os alunos acessam pelo navegador usando o IP do notebook:
   - **Portal Inicial & Plataforma CTF Segura (`platform` — porta `3000`):**
     - Portal: `http://192.168.1.50:3000`
     - Equipes, Desafios e Submissão de Flags: `http://192.168.1.50:3000/ctf`
     - Placar ao Vivo: `http://192.168.1.50:3000/ctf/placar`
     - Painel do Instrutor (Admin CTF): `http://192.168.1.50:3000/ctf/admin`
   - **Proz Store — Loja Vulnerável Alvo (`shop` — porta `3001`):**
     - Catálogo da Loja Alvo: `http://192.168.1.50:3001/loja`
   - *(O middleware redireciona automaticamente cliques entre `/ctf` e `/loja` para a porta correta mantendo o IP da LAN).*

### Passo 5 — Scripts de Reset Limpo (`reset.sh`) e Backup (`backup.sh`)
- **Resetar todo o ambiente entre turmas (`./reset.sh`):**
  Derruba os containers, apaga os volumes persistentes dos dois bancos (`docker compose down -v`), rotaciona o segredo de flags localmente via `/dev/urandom` (gerando 17 novas flags inéditas para a próxima turma), sobe os 4 serviços limpos e salva o novo `./FLAGS_REAIS.txt` (`chmod 600`):
  ```bash
  ./reset.sh
  ```
  *(Caso queira resetar os bancos mantendo exatamente as mesmas flags da turma anterior, execute `KEEP_FLAGS=true ./reset.sh`).*

- **Fazer backup consistente dos dois bancos + gabarito (`./backup.sh`):**
  Executa `pg_dump` dentro de `platform-db` e `shop-db` (sem precisar expor a porta `5432` no host), compacta com `gzip -9` em `./backups/<YYYYMMDD_HHMMSS>/`, copia o `FLAGS_REAIS.txt` da sessão e gera `SHA256SUMS.txt`:
  ```bash
  ./backup.sh
  ```

---

## 3. Como Executar no PC de Desenvolvimento (`npm run dev` + PostgreSQL via `docker-compose.dev.yml`)

> **Importante:**
> - Os schemas Prisma (`platform.prisma` e `shop.prisma`) utilizam **PostgreSQL**. O **Docker Desktop** (ou Docker Engine) precisa estar **ligado** no PC para subir os dois bancos locais (`platform-db` em `127.0.0.1:5433` e `shop-db` em `127.0.0.1:5434`).
> - O ambiente de **produção / sala de aula (notebook Debian)** continua utilizando exclusivamente `docker-compose.yml` e `./reset.sh` (Seção 2).

### Passo 1 — Gerar `.env` e `.env.local` (com URLs apontando para `127.0.0.1:5433` e `127.0.0.1:5434`)
No terminal (Git Bash / WSL / Linux / macOS):

```bash
./gerar-env.sh && ./gerar-env.sh --dev
```

- `./gerar-env.sh` cria o `.env` com segredos aleatórios (`PLATFORM_DB_PASSWORD`, `SHOP_DB_PASSWORD`, `PLATFORM_SESSION_SECRET`, `CTF_FLAG_SECRET`).
- `./gerar-env.sh --dev` gera o `.env.local` (ignorado pelo Git) com `DATABASE_URL_PLATFORM` (`127.0.0.1:5433`) e `DATABASE_URL_SHOP` (`127.0.0.1:5434`) usando as mesmas senhas do `.env`.

### Passo 2 — Subir os bancos de desenvolvimento, aplicar migrations/seed e iniciar o Next.js
```bash
npm install
npm run dev:db
npm run dev:setup
npm run dev
```

O que cada script faz:
- **`npm run dev:db`**: Sobe os 2 bancos PostgreSQL do `docker-compose.dev.yml` (publicados apenas em `127.0.0.1:5433` e `127.0.0.1:5434`) e aguarda ambos ficarem `healthy` (`--wait`).
- **`npm run dev:setup`**: Gera os clientes Prisma, executa `prisma migrate deploy` nos dois bancos e roda o `seed` inicial (salvando o gabarito em `FLAGS_REAIS.txt`).
- **`npm run dev`**: Inicia o servidor Next.js em `http://localhost:3000` (Plataforma em `/ctf` e Loja em `/loja`).
- **`npm run dev:reset`**: Derruba os volumes de desenvolvimento (`down -v`), sobe novamente os bancos limpos e reexecuta o `dev:setup`.
- **`npm run dev:down`**: Para os containers de banco de dados do ambiente de desenvolvimento.

---

## 4. 📋 Como os Alunos Copiam e Colam as Flags (Na Tela e no Modo F12)

O sistema foi desenhado para que os alunos nunca precisem digitar uma flag manualmente no teclado, mesmo nos desafios de **F12 (DevTools)**:

1. **Botão "Copiar Flag" em 1 clique nas telas da Loja:**
   - Sempre que uma flag aparece visualmente na tela (backup antigo, erro de debug do produto, perfil da Maria Silva, respostas do ProzBot, confirmação de checkout, observações de pedido IDOR, painel de suporte, XSS refletido, XSS armazenado e painéis admin), há um cartão com o botão **"Copiar Flag"**.
   - Ao clicar em **"Copiar Flag"**, a flag vai para a área de transferência (com suporte a HTTP em rede local `192.168.x.x`) e também fica salva automaticamente na sessão do navegador para ser colada com **1 clique** no botão **"Colar"** lá em `/ctf/desafios`.

2. **Como copiar a Flag dentro do F12 (Elements / Network / Console) sem precisar selecionar letra por letra:**
   - **Limpeza Automática Inteligente ao Colar (`extractCtfFlag`):** No painel `Elements` do F12, o navegador não permite arrastar o mouse facilmente dentro de um comentário HTML (`<!-- ... -->`). Com a nossa extração inteligente, **o aluno não precisa selecionar apenas a flag**:
     - Basta clicar **uma única vez** em cima da linha do comentário `<!-- TODO [DEV-PROZ]: ... Flag: CTF{...} -->` no F12 e apertar **`Ctrl + C`** (ou clicar com botão direito → *Copy* → *Copy element*).
     - Ao apertar **`Ctrl + V`** no campo de flag em `/ctf/desafios`, o sistema **remove automaticamente todo o comentário HTML ao redor** e deixa apenas `CTF{proz_...}` limpo no campo!
   - **Desmarcando `display: none` no F12 (Desafios #01 e #14):**
     - No rodapé da loja (`#debug-homologacao-rodape` no Desafio #01) e no menu do suporte (`/loja/suporte` no Desafio #14), se o aluno desmarcar a caixinha `element.style { display: none; }` no painel `Elements` do F12, **o botão visual aparece imediatamente na página** para clicar!
   - **Pela aba Console do F12 (Desafio #01):**
     - O comentário esquecido pelos desenvolvedores também aparece na aba **Console** do F12 (onde o texto pode ser selecionado livremente com o mouse), ou o aluno pode digitar `copiarFlagRodape()` no Console.
   - **Pela aba Network do F12 (Desafios #08 e #17):**
     - Na aba `Network` (ex.: resposta de `/api/produtos` ou `/api/recuperar-senha`), o aluno pode copiar a linha inteira ou até o JSON inteiro (`Ctrl + A`, `Ctrl + C`) e colar direto no campo de Flag (ou no campo de Token de Recuperação em `/loja/redefinir-senha`): o campo filtra e extrai sozinho apenas o código `CTF{...}` ou `reset_...`!

3. **Barra de Envio Rápido em `/ctf/desafios`:**
   - No topo da página `/ctf/desafios`, há uma barra de **Envio Rápido de Flag**: basta colar qualquer flag capturada e clicar em **"Validar Flag"** — o servidor identifica automaticamente a qual dos 17 desafios aquela flag pertence e credita os pontos para a equipe.

---

## 5. Como resetar o ambiente ou apenas a Loja entre turmas

- **Produção / Sala de Aula via Docker Compose (`docker-compose.yml` — derruba, apaga volumes e sobe limpo):**
  ```bash
  ./reset.sh
  ```
- **Desenvolvimento no PC (`docker-compose.dev.yml`):**
  ```bash
  npm run dev:reset
  ```

Se você também quiser **zerar apenas o placar de equipes** na Plataforma CTF sem recriar os containers:
1. Acesse `/ctf/admin` logado como `instrutor@proz.com`.
2. Clique no botão **"Resetar Placar"** (ou **"Limpar Equipes + Alunos"**) no topo do painel.

---

## 6. Gabarito e Credenciais de Teste

O gabarito e as credenciais de teste estão no [CHALLENGES.md](CHALLENGES.md) (uso exclusivo do instrutor).
