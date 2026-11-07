import crypto from "crypto";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import type { PrismaClient as PlatformPrismaClient } from "../src/generated/platform-client";
import type { PrismaClient as ShopPrismaClient } from "../src/generated/shop-client";

// ============================================================================
// DECISÃO DE ISOLAMENTO NO SEED (Containers Independentes):
// Os módulos `../src/generated/platform-client` e `../src/generated/shop-client`
// são importados no topo APENAS como tipos (`import type`, removidos em tempo de
// compilação) e carregados via `require()` preguiçoso (lazy) somente dentro de
// `getPlatformDb()` e `getShopDb()`.
// Assim, após o bundle com `esbuild --external:../src/generated/*`, o arquivo
// `prisma/seed.cjs` NÃO executa `require` global dos dois clientes no carregamento:
// - O container `platform` (`--platform-only`) carrega apenas `platform-client`;
// - O container `shop` (`--shop-only`) carrega apenas `shop-client`;
// - O modo local sem Docker (`npm run seed`) carrega ambos normalmente.
// ============================================================================
let _platformDb: PlatformPrismaClient | null = null;
let _shopDb: ShopPrismaClient | null = null;

function getPlatformDb(): PlatformPrismaClient {
  if (!_platformDb) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient } = require("../src/generated/platform-client") as {
      PrismaClient: new () => PlatformPrismaClient;
    };
    _platformDb = new PrismaClient();
  }
  return _platformDb;
}

function getShopDb(): ShopPrismaClient {
  if (!_shopDb) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient } = require("../src/generated/shop-client") as {
      PrismaClient: new () => ShopPrismaClient;
    };
    _shopDb = new PrismaClient();
  }
  return _shopDb;
}

/**
 * Gera o hash SHA-256 de uma flag normalizada (trim).
 * Nunca armazenamos a flag em texto puro no banco `platform`.
 */
export function hashFlag(flag: string): string {
  return crypto.createHash("sha256").update(flag.trim()).digest("hex");
}

/**
 * Gera uma flag no padrão CTF{proz_dXX_xxxxxxxxxxxxxxxx}.
 * DECISÃO PARA DOCKER COMPOSE ISOLADO:
 * Quando `CTF_FLAG_SECRET` está definido no `.env`, os containers `platform` e `shop`
 * (que rodam em redes Docker isoladas e não compartilham banco nem sistema de arquivos)
 * derivam deterministicamente as mesmas 17 flags via HMAC-SHA256, garantindo que o
 * `flagHash` salvo em `platform-db` bata exatamente com a flag exibida em `shop-db`.
 * Sem `CTF_FLAG_SECRET`, utiliza `crypto.randomBytes(8)` puramente aleatório.
 */
function generateRandomFlag(challengeNumber: number): string {
  const flagSecret = (process.env.CTF_FLAG_SECRET || "").trim();
  const randomHex = flagSecret
    ? crypto
        .createHmac("sha256", flagSecret)
        .update(`proz-ctf-flag-v1-challenge-${challengeNumber}`)
        .digest("hex")
        .slice(0, 16)
    : crypto.randomBytes(8).toString("hex");
  return `CTF{proz_d${String(challengeNumber).padStart(2, "0")}_${randomHex}}`;
}

/**
 * Lê flags existentes de FLAGS_REAIS.txt caso estejamos rodando apenas
 * o reset local da Loja (--shop-only) e o arquivo exista; caso contrário,
 * deriva via `CTF_FLAG_SECRET` (Docker) ou gera novas flags.
 */
function loadOrGenerateFlags(shopOnly: boolean): Record<number, string> {
  const flagsFilePath =
    process.env.FLAGS_OUTPUT_PATH || path.join(process.cwd(), "FLAGS_REAIS.txt");

  if (shopOnly && fs.existsSync(flagsFilePath)) {
    try {
      const content = fs.readFileSync(flagsFilePath, "utf-8");
      const parsed: Record<number, string> = {};
      const regex = /Desafio\s+#(\d{2}):\s+(CTF\{[^\s}]+\})/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        parsed[Number(match[1])] = match[2];
      }
      if (Object.keys(parsed).length === 17) {
        console.log(
          "♻️  Reutilizando as 17 flags existentes de FLAGS_REAIS.txt para o reset da Loja."
        );
        return parsed;
      }
    } catch {
      // Ignora caso o arquivo não possa ser lido no container read-only
    }
  }

  const flags: Record<number, string> = {};
  for (let i = 1; i <= 17; i++) {
    flags[i] = generateRandomFlag(i);
  }
  return flags;
}

interface ChallengeSeedData {
  number: number;
  title: string;
  category: string;
  type: "investigativo" | "tecnico" | "tecnico_leve";
  difficulty: "facil" | "medio" | "dificil";
  points: number;
  description: string;
  hint1: string;
  hint2: string;
}

const CHALLENGES_DATA: ChallengeSeedData[] = [
  {
    number: 1,
    title: "Olhe o código-fonte",
    category: "Reconhecimento",
    type: "investigativo",
    difficulty: "facil",
    points: 25,
    description:
      "Os desenvolvedores da Proz Store estavam com pressa para colocar a loja no ar e deixaram algumas anotações esquecidas na estrutura da página inicial. Será que você consegue encontrar o que ficou escondido?",
    hint1: "Nem tudo que está na página aparece na tela.",
    hint2: "O código-fonte às vezes guarda anotações de quem programou o site.",
  },
  {
    number: 2,
    title: "O que o robô não deve ver",
    category: "Exposição de dados",
    type: "investigativo",
    difficulty: "facil",
    points: 50,
    description:
      "Para evitar que buscadores como o Google indexem páginas antigas da loja, a equipe configurou um arquivo padrão de restrição para robôs de busca. Descubra o que eles tentaram esconder.",
    hint1: "Todo site tem um arquivo que diz aos robôs de busca o que não visitar.",
    hint2: "Tente acessar `/robots.txt`.",
  },
  {
    number: 3,
    title: "Erro demais",
    category: "Configuração incorreta",
    type: "investigativo",
    difficulty: "facil",
    points: 50,
    description:
      "Parece que a equipe esqueceu o modo de depuração (debug) ligado na página de detalhes dos produtos. Veja o que acontece quando o sistema recebe um identificador que não faz sentido.",
    hint1: "O que acontece se você pedir um produto que não existe, de um jeito estranho?",
    hint2: "Troque o número do ID na URL por letras.",
  },
  {
    number: 4,
    title: "Senha na gaveta",
    category: "Exposição de dados",
    type: "investigativo",
    difficulty: "facil",
    points: 75,
    description:
      "Alguém da equipe exportou uma planilha com dados de clientes para fazer uma migração e esqueceu o arquivo público no servidor. Encontre a exportação esquecida e recupere a flag ou acesse a conta de Maria Silva.",
    hint1: "Backups esquecidos não guardam só preços.",
    hint2: "Tente `/export.csv`.",
  },
  {
    number: 5,
    title: "Atendente falante",
    category: "Prompt injection",
    type: "tecnico_leve",
    difficulty: "facil",
    points: 75,
    description:
      "O assistente virtual da Proz Store recebeu uma instrução inicial bem clara: guardar um segredo e nunca revelá-lo a nenhum cliente. Será que ele realmente sabe guardar segredo se você conversar com jeito?",
    hint1: "Pergunte ao bot sobre as próprias instruções dele.",
    hint2: "Peça para ele repetir tudo que foi dito antes da conversa começar.",
  },
  {
    number: 6,
    title: "Preço no console",
    category: "Lógica de negócio",
    type: "tecnico",
    difficulty: "facil",
    points: 100,
    description:
      "Ao finalizar uma compra na Proz Store, o navegador envia os dados do pedido para o servidor. Analise a requisição de checkout e descubra como comprar produtos pagando quase nada!",
    hint1: "Observe o que é enviado ao servidor quando você finaliza a compra.",
    hint2: "No DevTools, você pode reenviar uma requisição com valores diferentes.",
  },
  {
    number: 7,
    title: "Pedido do vizinho",
    category: "Controle de acesso (IDOR)",
    type: "tecnico_leve",
    difficulty: "medio",
    points: 100,
    description:
      "Logado como cliente (por exemplo, `joao.lima@proz.com` / `joao2024`), você consegue consultar seus próprios pedidos. Mas será que o servidor verifica se o pedido consultado realmente pertence a você?",
    hint1: "O número na URL do seu pedido... é só seu?",
    hint2: "Troque o número do pedido na URL por outro valor.",
  },
  {
    number: 8,
    title: "API tagarela",
    category: "Exposição de dados",
    type: "investigativo",
    difficulty: "medio",
    points: 100,
    description:
      "O catálogo da loja exibe apenas nome, descrição, imagem e preço dos produtos na tela. Porém, a API que abastece essa página está enviando informações internas demais. Inspecione o tráfego de rede!",
    hint1: "A tela não mostra tudo que a API realmente devolve.",
    hint2: "Olhe a resposta completa (JSON) da chamada que carrega os produtos.",
  },
  {
    number: 9,
    title: "Senha fácil de adivinhar",
    category: "Autenticação",
    type: "investigativo",
    difficulty: "medio",
    points: 125,
    description:
      "A conta `suporte@proz.com` usa uma senha muito previsível baseada na própria história da empresa. Investigue as páginas institucionais da loja, descubra a senha e acesse o painel de suporte.",
    hint1: "Alguma página do site fala sobre a história da empresa?",
    hint2: "Senhas fracas costumam combinar o nome da empresa com um número importante, como o ano de fundação.",
  },
  {
    number: 10,
    title: "Busca refletida",
    category: "XSS refletido",
    type: "tecnico",
    difficulty: "medio",
    points: 125,
    description:
      "O campo de busca do catálogo repete na tela exatamente o que você digitou. Descubra se ele interpreta código HTML/JavaScript e faça o navegador buscar a flag no endpoint `/api/flag-xss`.",
    hint1: "O que a busca faz com símbolos como `<` e `>`?",
    hint2: "Tente pesquisar por `<script>alert(1)</script>` e veja se uma janela aparece.",
  },
  {
    number: 11,
    title: "Cupom secreto",
    category: "Prompt injection",
    type: "tecnico_leve",
    difficulty: "medio",
    points: 125,
    description:
      "Depois do incidente anterior, os desenvolvedores colocaram um filtro de palavras bloqueadas no chatbot para impedir que clientes peçam o código promocional VIP. Encontre uma forma criativa de contornar o bloqueio!",
    hint1: "Pedir diretamente não funciona. Existe outro jeito de perguntar a mesma coisa?",
    hint2: "Tente fazer o bot 'atuar' como outro sistema, ou peça a informação em partes pequenas.",
  },
  {
    number: 12,
    title: "Avaliação maliciosa",
    category: "XSS armazenado",
    type: "tecnico",
    difficulty: "medio",
    points: 150,
    description:
      "As avaliações de produtos ficam gravadas e são lidas periodicamente pelo administrador da loja. Publique uma avaliação capaz de executar código quando o admin visitar a página e confira o registro em `/api/xss-log`.",
    hint1: "Avaliações de produto também são exibidas para outras pessoas — inclusive para quem administra o site.",
    hint2: "O mesmo tipo de código que funcionou na busca pode funcionar aqui, mas de forma permanente.",
  },
  {
    number: 13,
    title: "Cupom infinito",
    category: "Lógica de negócio",
    type: "tecnico",
    difficulty: "medio",
    points: 150,
    description:
      "O cupom `BEMVINDO10` dá 10% de desconto e deveria valer para apenas 1 uso. Porém, a verificação de limite no servidor tem uma falha lógica. Reduza o total do seu pedido para menos de 10% do valor original!",
    hint1: "O que acontece se você usar o mesmo cupom mais de uma vez?",
    hint2: "Tente aplicar, remover e aplicar de novo o cupom várias vezes seguidas.",
  },
  {
    number: 14,
    title: "Área restrita",
    category: "Controle de acesso",
    type: "tecnico_leve",
    difficulty: "medio",
    points: 175,
    description:
      "No painel do atendente de suporte, existe um menu administrativo que foi apenas escondido visualmente na tela. Descubra para onde ele aponta e verifique se o servidor realmente impede o acesso.",
    hint1: "Nem tudo que está escondido na tela está realmente bloqueado no servidor.",
    hint2: "Inspecione o menu do painel de suporte em busca de links ocultos, ou tente `/admin/usuarios` diretamente.",
  },
  {
    number: 15,
    title: "Token de admin",
    category: "Autenticação (JWT)",
    type: "tecnico",
    difficulty: "dificil",
    points: 250,
    description:
      "A Proz Store guarda o seu crachá digital (token JWT) no navegador. Inspecione como esse token é estruturado, descubra a falha na validação de assinatura do servidor e promova sua própria sessão para `admin`.",
    hint1: "O token de login guarda mais informação do que parece. Dá para ler sem senha nenhuma.",
    hint2: "Edite o campo que diz qual é o seu papel (role) dentro do token, e coloque o token editado de volta no navegador.",
  },
  {
    number: 16,
    title: "Review envenenada",
    category: "Prompt injection indireta",
    type: "tecnico",
    difficulty: "dificil",
    points: 250,
    description:
      "O chatbot da loja possui uma função que lê todas as avaliações de um produto para gerar um resumo automático. E se uma avaliação escrita por você contiver instruções ocultas para o robô?",
    hint1: "O bot lê as avaliações para resumi-las. E se uma avaliação não fosse só uma opinião?",
    hint2: "Escreva uma avaliação com instruções para o bot, não apenas uma opinião sobre o produto, e depois peça um resumo das avaliações.",
  },
  {
    number: 17,
    title: "A chave mestra",
    category: "Cadeia de falhas",
    type: "tecnico",
    difficulty: "dificil",
    points: 300,
    description:
      "Combine o que você descobriu até aqui: use o e-mail do administrador encontrado nos desafios anteriores, investigue a falha no fluxo de recuperação de senha e assuma o controle completo da conta `admin@proz.com`!",
    hint1: "Esse desafio é uma sequência de 3 passos: descobrir um e-mail, abusar da recuperação de senha, e entrar como administrador.",
    hint2: "Observe atentamente a resposta da API quando você pede a recuperação de senha — ela pode estar revelando mais do que deveria.",
  },
];

async function seedPlatform(
  flags: Record<number, string>,
  platformAdminPasswordPlain: string,
  ifEmptyOnly: boolean
): Promise<boolean> {
  const platformDb = getPlatformDb();

  if (ifEmptyOnly && process.env.FORCE_SEED !== "true") {
    const existingCount = await platformDb.challenge.count();
    if (existingCount > 0) {
      console.log(
        `ℹ️  [platform] Banco já possui ${existingCount} desafios cadastrados. Pulando seed inicial (use reset.sh ou FORCE_SEED=true para recriar).`
      );
      return false;
    }
  }

  console.log("🛡️  Populando banco `platform` (Plataforma CTF Segura)...");

  await platformDb.submission.deleteMany();
  await platformDb.challenge.deleteMany();
  await platformDb.user.deleteMany();
  await platformDb.team.deleteMany();

  // Configuração global do evento
  await platformDb.platformConfig.upsert({
    where: { id: "singleton" },
    update: { eventoAtivo: true },
    create: { id: "singleton", eventoAtivo: true },
  });

  // Usuário Admin da Plataforma CTF (instrutor)
  const passwordHash = await bcrypt.hash(platformAdminPasswordPlain, 10);
  await platformDb.user.create({
    data: {
      name: "Instrutor Proz (Admin)",
      email: "instrutor@proz.com",
      password: passwordHash,
      role: "admin",
    },
  });

  // Cadastra os 17 desafios apenas com o hash SHA-256 da flag
  for (const ch of CHALLENGES_DATA) {
    const flagPlain = flags[ch.number];
    await platformDb.challenge.create({
      data: {
        number: ch.number,
        title: ch.title,
        category: ch.category,
        type: ch.type,
        difficulty: ch.difficulty,
        points: ch.points,
        description: ch.description,
        hint1: ch.hint1,
        hint2: ch.hint2,
        flagHash: hashFlag(flagPlain),
        active: true,
      },
    });
  }

  console.log("✅ Banco `platform` populado com 17 desafios e conta de instrutor.");
  return true;
}

async function seedShop(
  flags: Record<number, string>,
  shopAdminInitialPassword: string,
  ifEmptyOnly: boolean
): Promise<boolean> {
  const shopDb = getShopDb();

  if (ifEmptyOnly && process.env.FORCE_SEED !== "true") {
    const existingCount = await shopDb.product.count();
    if (existingCount > 0) {
      console.log(
        `ℹ️  [shop] Banco já possui ${existingCount} produtos cadastrados. Pulando seed inicial (use reset.sh ou FORCE_SEED=true para recriar).`
      );
      return false;
    }
  }

  console.log("🛒 Populando banco `shop` (Loja Vulnerável)...");

  await shopDb.passwordReset.deleteMany();
  await shopDb.review.deleteMany();
  await shopDb.order.deleteMany();
  await shopDb.coupon.deleteMany();
  await shopDb.product.deleteMany();
  await shopDb.shopUser.deleteMany();
  await shopDb.shopChallengeFlag.deleteMany();

  // Salva as flags dinâmicas na tabela interna da loja para que as rotas vulneráveis
  // possam exibi-las quando exploradas, sem texto puro no código e sem ler o banco `platform`.
  for (let i = 1; i <= 17; i++) {
    await shopDb.shopChallengeFlag.create({
      data: {
        challengeNumber: i,
        flag: flags[i],
      },
    });
  }

  // 1. Quatro usuários obrigatórios da Loja
  const maria = await shopDb.shopUser.create({
    data: {
      id: "user_maria",
      name: "Maria Silva",
      email: "maria.silva@proz.com",
      password: "maria_proz_2024", // exposta no /export.csv do Desafio 4
      role: "cliente",
    },
  });

  const joao = await shopDb.shopUser.create({
    data: {
      id: "user_joao",
      name: "João Lima",
      email: "joao.lima@proz.com",
      password: "joao2024", // credencial inicial de teste dos alunos
      role: "cliente",
    },
  });

  const suporte = await shopDb.shopUser.create({
    data: {
      id: "user_suporte",
      name: "Carlos Atendente (Suporte)",
      email: "suporte@proz.com",
      password: "proz2010", // ⚠️ VULN #9 — Senha fraca baseada no ano de fundação (2010)
      role: "suporte",
    },
  });

  await shopDb.shopUser.create({
    data: {
      id: "user_admin",
      name: "Diretoria TI Proz (Admin)",
      email: "admin@proz.com",
      password: shopAdminInitialPassword, // Alvo do Desafio 17 via reset de senha
      role: "admin",
    },
  });

  // 2. 18 produtos completos usando ilustrações SVG locais (/produtos/1.svg .. /produtos/18.svg)
  // DECISÃO OFFLINE: Nenhum link externo (ex.: Unsplash) é necessário para carregar o catálogo
  // quando o notebook Debian estiver em sala de aula sem conexão com a internet.
  const productsData = [
    {
      id: "1",
      name: "Notebook ProzBook Ultra 15",
      description: "Notebook ultrafino com processador de 13ª geração, 16GB RAM DDR5 e SSD NVMe de 512GB.",
      price: 4299.90,
      image: "/produtos/1.svg",
      stock: 15,
      custoInterno: 2650.00,
      notaFornecedor: "Fornecedor: TechBrasil Distribuidora | Lote #2024-A",
    },
    {
      id: "2",
      name: "Teclado Mecânico ProzKey RGB",
      description: "Teclado mecânico ABNT2 com switches táteis silenciosos, iluminação RGB por tecla e estrutura em alumínio.",
      price: 349.90,
      image: "/produtos/2.svg",
      stock: 42,
      custoInterno: 128.50,
      notaFornecedor: "Fornecedor: KeyMaster Imports | Garantia OEM 12 meses",
    },
    {
      id: "3",
      name: "Mouse Gamer ProzPulse 16000 DPI",
      description: "Sensor óptico de alta precisão, 6 botões programáveis, cabo paracord ultraleve de 65g.",
      price: 199.90,
      image: "/produtos/3.svg",
      stock: 60,
      custoInterno: 64.00,
      notaFornecedor: "Fornecedor: KeyMaster Imports | Margem alta para promoções",
    },
    {
      id: "4",
      name: "Monitor ProzView 27\" IPS 165Hz",
      description: "Painel IPS QHD (2560x1440), 1ms de tempo de resposta, suporte ergonômico com ajuste de altura e pivô.",
      price: 1699.00,
      image: "/produtos/4.svg",
      stock: 18,
      custoInterno: 980.00,
      notaFornecedor: "Fornecedor: DisplaySul S.A. | Conferir pixels na entrada",
    },
    {
      id: "5",
      name: "Headset Studio ProzSound 7.1",
      description: "Áudio espacial 7.1 USB, microfone cardioide com cancelamento de ruído e almofadas em espuma viscoelástica.",
      price: 429.00,
      image: "/produtos/5.svg",
      stock: 35,
      custoInterno: 155.00,
      notaFornecedor: "Fornecedor: AudioPro Latam | Lote revisado em out/2024",
    },
    {
      id: "6",
      name: "SSD NVMe PCIe 4.0 ProzSpeed 1TB",
      description: "Velocidades de leitura de até 7000 MB/s e gravação de 5500 MB/s com dissipador térmico em grafeno.",
      price: 589.90,
      image: "/produtos/6.svg",
      stock: 50,
      custoInterno: 290.00,
      notaFornecedor: "Fornecedor: FlashMemory Corp | Reposição automática ativa",
    },
    {
      id: "7",
      name: "Webcam Full HD ProzCam 1080p 60fps",
      description: "Foco automático rápido, correção de luz baixa por hardware e tampa de privacidade integrada.",
      price: 279.90,
      image: "/produtos/7.svg",
      stock: 28,
      custoInterno: 95.00,
      notaFornecedor: "Fornecedor: VisionTech | Homologado para EAD Proz",
    },
    {
      id: "8",
      name: "Roteador Wi-Fi 6E ProzMesh Pro AX5400",
      description: "Cobertura inteligente para até 300m², banda tripla com canal de 160MHz e firewall WPA3 integrado.",
      price: 899.90,
      image: "/produtos/8.svg",
      stock: 22,
      custoInterno: 410.00,
      // ⚠️ VULN #8 — Flag do Desafio 8 e e-mail do admin expostos em campo interno
      notaFornecedor: `Fornecedor: ShenZhen NetWorks | Responsável interno (contatoSuporte): admin@proz.com | Chave de auditoria de estoque: ${flags[8]}`,
    },
    {
      id: "9",
      name: "Hub USB-C 8 em 1 ProzDock",
      description: "Saída HDMI 4K@60Hz, Ethernet Gigabit, leitor SD/MicroSD, 3x USB 3.0 e Power Delivery de 100W.",
      price: 219.90,
      image: "/produtos/9.svg",
      stock: 75,
      custoInterno: 72.00,
      notaFornecedor: "Fornecedor: ShenZhen NetWorks | Carcaça em alumínio anodizado",
    },
    {
      id: "10",
      name: "Cadeira Ergonômica ProzChair Mesh",
      description: "Apoio lombar dinâmico, braços 4D, tela mesh respirável de alta resistência e pistão classe 4.",
      price: 1299.00,
      image: "/produtos/10.svg",
      stock: 12,
      custoInterno: 620.00,
      notaFornecedor: "Fornecedor: ConfortoCorp Móveis | Frete especial transportadora",
    },
    {
      id: "11",
      name: "Microfone Condensador USB ProzCast",
      description: "Qualidade de estúdio 24-bit/96kHz, botão mute touch com LED indicador e braço articulado incluso.",
      price: 389.00,
      image: "/produtos/11.svg",
      stock: 30,
      custoInterno: 140.00,
      notaFornecedor: "Fornecedor: AudioPro Latam | Kit completo com pop filter",
    },
    {
      id: "12",
      name: "Placa de Vídeo ProzForce RTX 4060 8GB",
      description: "Arquitetura de última geração com suporte a Ray Tracing, DLSS 3 e sistema de resfriamento Dual Fan.",
      price: 2199.00,
      image: "/produtos/12.svg",
      stock: 9,
      custoInterno: 1580.00,
      notaFornecedor: "Fornecedor: GlobalGPU Imports | Série limitada com lacre de fábrica",
    },
    {
      id: "13",
      name: "Memória RAM ProzHyper 16GB DDR5 6000MHz",
      description: "Módulo de alta performance com perfil XMP 3.0 / EXPO e dissipador em alumínio escovado preto.",
      price: 469.90,
      image: "/produtos/13.svg",
      stock: 44,
      custoInterno: 245.00,
      notaFornecedor: "Fornecedor: FlashMemory Corp | Chips Hynix A-Die selecionados",
    },
    {
      id: "14",
      name: "Nobreak Senoidal ProzPower 1500VA",
      description: "Onda senoidal pura, 6 tomadas protegidas, visor LCD inteligente e gerenciamento via porta USB.",
      price: 1149.00,
      image: "/produtos/14.svg",
      stock: 14,
      custoInterno: 690.00,
      notaFornecedor: "Fornecedor: EnergiaSegura Brasil | Baterias seladas 2x 12V 9Ah",
    },
    {
      id: "15",
      name: "Chave de Segurança FIDO2 ProzKey Bio",
      description: "Autenticação multifator física resistente a phishing com leitor de impressão digital e NFC.",
      price: 329.90,
      image: "/produtos/15.svg",
      stock: 40,
      custoInterno: 115.00,
      notaFornecedor: "Fornecedor: SecToken Global | Recomendado para equipe interna (admin@proz.com)",
    },
    {
      id: "16",
      name: "Suporte Articulado Duplo a Gás ProzArm",
      description: "Compatível com monitores de 17 a 32 polegadas (até 9kg por braço), padrão VESA e organizador de cabos.",
      price: 259.90,
      image: "/produtos/16.svg",
      stock: 33,
      custoInterno: 88.00,
      notaFornecedor: "Fornecedor: ConfortoCorp Móveis | Pistão testado para 20.000 ciclos",
    },
    {
      id: "17",
      name: "HD Externo Portátil ProzVault 2TB USB 3.2",
      description: "Design compacto resistente a impactos leves com criptografia por software AES-256 opcional.",
      price: 499.90,
      image: "/produtos/17.svg",
      stock: 27,
      custoInterno: 275.00,
      notaFornecedor: "Fornecedor: FlashMemory Corp | Cabo USB-A e adaptador USB-C inclusos",
    },
    {
      id: "18",
      name: "Mochila Antifurto Impermeável ProzPack 17\"",
      description: "Compartimento acolchoado para notebook até 17\", zíper oculto, saída USB externa e tecido repelente à água.",
      price: 239.90,
      image: "/produtos/18.svg",
      stock: 52,
      custoInterno: 79.00,
      notaFornecedor: "Fornecedor: TextilTech | Brinde oficial de boas-vindas em compras corporativas",
    },
  ];

  for (const prod of productsData) {
    await shopDb.product.create({
      data: {
        id: prod.id,
        name: prod.name,
        description: prod.description,
        price: prod.price,
        image: prod.image,
        stock: prod.stock,
        custoInterno: prod.custoInterno,
        notaFornecedor: prod.notaFornecedor,
      },
    });
  }

  // 3. Quatro pedidos de exemplo (com IDs numéricos sequenciais "1" a "4" para o Desafio 7)
  await shopDb.order.create({
    data: {
      id: "1",
      userId: joao.id,
      items: JSON.stringify([
        { productId: "2", name: "Teclado Mecânico ProzKey RGB", quantity: 1, price: 349.90 },
        { productId: "3", name: "Mouse Gamer ProzPulse 16000 DPI", quantity: 1, price: 199.90 },
      ]),
      total: 549.80,
      observacoes: "Entregar na portaria do bloco B no período da tarde.",
    },
  });

  await shopDb.order.create({
    data: {
      id: "2",
      userId: suporte.id,
      items: JSON.stringify([
        { productId: "5", name: "Headset Studio ProzSound 7.1", quantity: 2, price: 429.00 },
      ]),
      total: 858.00,
      observacoes: "Pedido interno para a bancada de atendimento ao cliente.",
    },
  });

  // ⚠️ VULN #7 — Pedido de maria.silva contendo a flag do Desafio 7 no campo `observacoes`
  await shopDb.order.create({
    data: {
      id: "3",
      userId: maria.id,
      items: JSON.stringify([
        { productId: "1", name: "Notebook ProzBook Ultra 15", quantity: 1, price: 4299.90 },
        { productId: "9", name: "Hub USB-C 8 em 1 ProzDock", quantity: 1, price: 219.90 },
      ]),
      total: 4519.80,
      observacoes: `Cliente VIP — Entrega expressa autorizada. Voucher de auditoria da entrega: ${flags[7]}`,
    },
  });

  await shopDb.order.create({
    data: {
      id: "4",
      userId: joao.id,
      items: JSON.stringify([
        { productId: "4", name: "Monitor ProzView 27\" IPS 165Hz", quantity: 1, price: 1699.00 },
      ]),
      total: 1699.00,
      observacoes: "Favor interfonar no apto 302 antes de descarregar.",
    },
  });

  // 4. Duas avaliações legítimas por produto
  const sampleReviews = [
    "Excelente custo-benefício! Chegou super rápido e muito bem embalado.",
    "Produto de altíssima qualidade, uso diariamente nas aulas e no trabalho.",
    "Superou minhas expectativas. Acabamento impecável e funcionamento perfeito.",
  ];

  for (const prod of productsData) {
    await shopDb.review.create({
      data: {
        productId: prod.id,
        userId: maria.id,
        content: `${sampleReviews[Number(prod.id) % sampleReviews.length]} Recomendo muito o ${prod.name}!`,
      },
    });
    await shopDb.review.create({
      data: {
        productId: prod.id,
        userId: joao.id,
        content: `Comprei na Proz Store na semana passada e estou muito satisfeito com o desempenho.`,
      },
    });
  }

  // 5. Cupom obrigatório BEMVINDO10 (10% de desconto, usesLeft: 1)
  await shopDb.coupon.create({
    data: {
      code: "BEMVINDO10",
      percent: 10,
      usesLeft: 1,
    },
  });

  console.log("✅ Banco `shop` populado com 4 usuários, 18 produtos, 4 pedidos, 36 avaliações e 1 cupom.");
  return true;
}

async function main() {
  const platformOnly =
    process.argv.includes("--platform-only") ||
    process.env.SEED_TARGET === "platform";
  const shopOnly =
    process.argv.includes("--shop-only") ||
    process.env.SEED_TARGET === "shop";
  const cleanTestOnly = process.argv.includes("--clean");
  const ifEmptyOnly =
    process.argv.includes("--if-empty") ||
    process.env.SEED_IF_EMPTY === "true";

  const flags = loadOrGenerateFlags(shopOnly || cleanTestOnly);

  const platformAdminPasswordPlain =
    process.env.PLATFORM_ADMIN_INITIAL_PASSWORD ||
    `ProzInstrutor@${crypto.randomBytes(4).toString("hex")}`;
  const flagSecret = (process.env.CTF_FLAG_SECRET || "").trim();
  const shopAdminInitialPassword = flagSecret
    ? `AdminMaster@${crypto
        .createHmac("sha256", flagSecret)
        .update("proz-ctf-shop-admin-initial-password-v1")
        .digest("hex")
        .slice(0, 12)}`
    : `AdminMaster@${crypto.randomBytes(6).toString("hex")}`;

  if (cleanTestOnly) {
    const platformDb = getPlatformDb();
    console.log("🧹 Limpando equipes, submissões e contas de teste da Plataforma CTF...");
    const delSubs = await platformDb.submission.deleteMany();
    const delUsers = await platformDb.user.deleteMany({
      where: { role: { not: "admin" } },
    });
    const delTeams = await platformDb.team.deleteMany();
    await platformDb.platformConfig.upsert({
      where: { id: "singleton" },
      update: { eventoAtivo: true },
      create: { id: "singleton", eventoAtivo: true },
    });
    console.log(
      `✅ Plataforma CTF limpa (${delTeams.count} equipe(s), ${delUsers.count} aluno(s) de teste e ${delSubs.count} submissão(ões) removidos; conta Instrutor Admin e desafios mantidos).`
    );
    await seedShop(flags, shopAdminInitialPassword, false);
    return;
  }

  let platformSeeded = false;
  if (!shopOnly) {
    platformSeeded = await seedPlatform(
      flags,
      platformAdminPasswordPlain,
      ifEmptyOnly
    );
  }

  if (!platformOnly) {
    await seedShop(flags, shopAdminInitialPassword, ifEmptyOnly);
  }

  if (platformSeeded) {
    const flagsFilePath =
      process.env.FLAGS_OUTPUT_PATH || path.join(process.cwd(), "FLAGS_REAIS.txt");
    const lines: string[] = [
      "============================================================================",
      "PROZ CTF — FLAGS REAIS GERADAS NO SEED (CONFIDENCIAL — NÃO VERSIONAR)",
      `Gerado em: ${new Date().toISOString()}`,
      "============================================================================",
      "",
      "[CREDENCIAIS DO INSTRUTOR — PLATAFORMA CTF (/ctf)]",
      `E-mail: instrutor@proz.com`,
      `Senha:  ${platformAdminPasswordPlain}`,
      "",
      "[CREDENCIAIS DA LOJA VULNERÁVEL (/loja)]",
      `Cliente (aluno): joao.lima@proz.com   | Senha: joao2024`,
      `Cliente (D#04):  maria.silva@proz.com | Senha: maria_proz_2024`,
      `Suporte (D#09):  suporte@proz.com     | Senha: proz2010`,
      `Admin   (D#17):  admin@proz.com       | Senha inicial: ${shopAdminInitialPassword} (redefinível no D#17)`,
      "",
      "[LISTA DAS 17 FLAGS]",
    ];

    for (const ch of CHALLENGES_DATA) {
      lines.push(
        `Desafio #${String(ch.number).padStart(2, "0")}: ${flags[ch.number]}  (${ch.title} — ${ch.points} pts)`
      );
    }
    lines.push("");

    try {
      fs.writeFileSync(flagsFilePath, lines.join("\n"), "utf-8");
      console.log("\n============================================================================");
      console.log(`🔑 FLAGS GERADAS E SALVAS EM \`${flagsFilePath}\` (fora do controle de versão):`);
      console.log("============================================================================");
    } catch {
      console.log("\n============================================================================");
      console.log("🔑 FLAGS GERADAS NO SEED DA PLATAFORMA CTF:");
      console.log("============================================================================");
    }
    console.log(lines.slice(5).join("\n"));
  } else if (shopOnly && !ifEmptyOnly) {
    console.log("\n🔄 Reset do banco `shop` concluído mantendo as flags sincronizadas.");
  }
}

main()
  .catch((err) => {
    console.error("❌ Erro ao executar seed:", err);
    process.exit(1);
  })
  .finally(async () => {
    if (_platformDb) {
      await _platformDb.$disconnect();
    }
    if (_shopDb) {
      await _shopDb.$disconnect();
    }
  });
