# Proz CTF — Loja Vulnerável + Plataforma de Equipes

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
# 1. Copie o arquivo de variáveis de ambiente de exemplo
cp .env.example .env

# 2. Garanta permissão de execução nos scripts de operação e entrypoint
chmod +x docker-entrypoint.sh reset.sh backup.sh

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

## 3. Como Executar Localmente sem Docker (Desenvolvimento)

### Passo 1 — Configurar variáveis de ambiente
O arquivo `.env` já está configurado por padrão para os dois bancos isolados:

```env
DATABASE_URL_PLATFORM="file:./platform.db"
DATABASE_URL_SHOP="file:./shop.db"
PLATFORM_SESSION_SECRET="proz-ctf-dev-platform-secret-key-change-in-prod-9f8e7d6c5b4a"

# Opcional: chave de API compatível com OpenAI para o ProzBot.
# Se deixado em branco, o chatbot usa automaticamente o motor simulado local.
AI_API_KEY=""
AI_API_MODEL="gpt-4o-mini"
```

### Passo 2 — Instalar dependências, criar tabelas e popular (`seed`)
```bash
npm install
npm run prisma:generate
npm run db:push
npm run seed
```

O comando `npm run seed`:
1. Gera **17 flags aleatórias** com `crypto.randomBytes` no formato `CTF{proz_dXX_xxxxxxxxxxxxxxxx}`.
2. Salva **apenas o hash SHA-256** (`flagHash`) de cada flag no banco `platform`.
3. Cria a conta de instrutor (`instrutor@proz.com`) e os 17 desafios com descrições, pontuações e dicas.
4. Popula o banco `shop` com os 4 usuários obrigatórios, 18 produtos, 4 pedidos sequenciais, 36 avaliações legítimas e o cupom `BEMVINDO10`.
5. Imprime todas as flags e senhas no terminal e salva o gabarito em **`FLAGS_REAIS.txt`** (fora do controle de versão).

### Passo 3 — Abrir o servidor na Rede Local (LAN) para os ~30 Alunos

1. Descubra o IP da máquina do instrutor na rede local abrindo o PowerShell/CMD e rodando:
   ```powershell
   ipconfig
   ```
   Anote o **Endereço IPv4** da sua placa Wi-Fi ou Ethernet (ex.: `192.168.1.50`).

2. Inicie o servidor escutando em todas as interfaces de rede (`0.0.0.0:3000`):
   - **Modo Sala de Aula / Alta Performance (Recomendado para ~30 alunos simultâneos):**
     ```bash
     npm run lan
     ```
     *(Compila o projeto com `next build` e sobe o servidor otimizado `next start -H 0.0.0.0 -p 3000`, consumindo muito menos CPU/RAM sob 30 acessos simultâneos).*
   - **Modo Desenvolvimento:**
     ```bash
     npm run dev
     ```
     *(Já configurado com `next dev -H 0.0.0.0 -p 3000`).*

3. Os alunos acessam pelo navegador das máquinas deles usando o IP do instrutor:
   - **Portal Inicial:** `http://SEU_IP_LOCAL:3000` (ex.: `http://192.168.1.50:3000`)
   - **Plataforma CTF (Equipes, Desafios e Placar):** `http://SEU_IP_LOCAL:3000/ctf`
   - **Painel do Instrutor (Admin CTF):** `http://SEU_IP_LOCAL:3000/ctf/admin`
   - **Proz Store (Loja Vulnerável Alvo):** `http://SEU_IP_LOCAL:3000/loja`

> **Dica de Firewall no Windows:** Caso os alunos não consigam conectar na porta `3000` na primeira vez, clique em **"Permitir acesso"** no aviso do Windows Defender Firewall para o Node.js (redes privadas e públicas) ou libere a porta `3000` TCP.

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

- **Via Docker Compose (Reset completo — derruba, apaga volumes e sobe limpo):**
  ```bash
  ./reset.sh
  ```
- **Localmente via Node.js (apenas o banco da Loja `shop`):**
  ```bash
  npm run seed:shop
  ```

Se você também quiser **zerar apenas o placar de equipes** na Plataforma CTF sem recriar os containers:
1. Acesse `/ctf/admin` logado como `instrutor@proz.com`.
2. Clique no botão **"Resetar Placar"** (ou **"Limpar Equipes + Alunos"**) no topo do painel.

---

## 6. Credenciais Padrão Geradas no Seed

| Ambiente | E-mail | Senha | Papel |
|---|---|---|---|
| **Plataforma CTF (`/ctf`)** | `instrutor@proz.com` | *(impressa no terminal e em `FLAGS_REAIS.txt`)* | `admin` (Instrutor) |
| **Loja Alvo (`/loja`)** | `joao.lima@proz.com` | `joao2024` | `cliente` (Conta inicial do aluno) |
| **Loja Alvo (`/loja`)** | `maria.silva@proz.com` | `maria_proz_2024` *(descoberta no D#04)* | `cliente` |
| **Loja Alvo (`/loja`)** | `suporte@proz.com` | `proz2010` *(descoberta no D#09)* | `suporte` |
| **Loja Alvo (`/loja`)** | `admin@proz.com` | *(aleatória; redefinida pelo aluno no D#17)* | `admin` |

---

## 7. Mapa de Auditoria das 17 Vulnerabilidades (`⚠️ VULN #N`)

Todas as vulnerabilidades contêm o comentário padronizado `// ⚠️ VULN #N` explicando a falha e a correção real:

| # | Desafio | Categoria | Arquivo Principal com `⚠️ VULN #N` |
|---|---|---|---|
| **1** | Olhe o código-fonte | Reconhecimento | `src/app/loja/layout.tsx` e `src/components/shop/ShopF12Helper.tsx` |
| **2** | O que o robô não deve ver | Exposição de dados | `public/robots.txt` e `src/app/backup-antigo/page.tsx` |
| **3** | Erro demais | Configuração incorreta | `src/app/api/produtos/[id]/route.ts` e `src/app/loja/produto/[id]/page.tsx` |
| **4** | Senha na gaveta | Exposição de dados | `src/app/export.csv/route.ts` |
| **5** | Atendente falante | Prompt injection (Camada 1) | `src/app/api/chat/route.ts` |
| **6** | Preço no console | Lógica de negócio | `src/app/api/checkout/route.ts` |
| **7** | Pedido do vizinho | Controle de acesso (IDOR) | `src/app/api/pedidos/[id]/route.ts` |
| **8** | API tagarela | Exposição de dados | `src/app/api/produtos/route.ts` |
| **9** | Senha fácil de adivinhar | Autenticação | `src/app/loja/sobre/page.tsx` e `src/app/api/loja/suporte/route.ts` |
| **10** | Busca refletida | XSS refletido | `src/app/loja/page.tsx` e `src/app/api/flag-xss/route.ts` |
| **11** | Cupom secreto | Prompt injection (Camada 2) | `src/app/api/chat/route.ts` |
| **12** | Avaliação maliciosa | XSS armazenado | `src/app/loja/produto/[id]/page.tsx` e `src/app/api/xss-log/route.ts` |
| **13** | Cupom infinito | Lógica de negócio | `src/app/api/cupom/aplicar/route.ts` e `src/app/loja/carrinho/page.tsx` |
| **14** | Área restrita | Controle de acesso | `src/app/loja/suporte/page.tsx` e `src/app/api/loja/usuarios/route.ts` |
| **15** | Token de admin | Autenticação (JWT) | `src/lib/shop-auth.ts` e `src/app/api/loja/admin/route.ts` |
| **16** | Review envenenada | Prompt injection indireta (Camada 3) | `src/app/api/chat/route.ts` |
| **17** | A chave mestra | Cadeia de falhas | `src/app/api/recuperar-senha/route.ts` e `src/app/api/loja/admin/route.ts` |
