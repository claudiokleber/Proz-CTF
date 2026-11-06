/** @type {import('next').NextConfig} */
const nextConfig = {
  // DECISÃO DE ARQUITETURA (Containerização):
  // `output: "standalone"` instrui o Next.js a rastrear apenas os arquivos e dependências
  // estritamente necessários para produção (via @vercel/nft) e gerar uma pasta `.next/standalone`
  // autocontida com um servidor `server.js` mínimo.
  // Isso reduz drasticamente o tamanho final das imagens Docker (de ~1.2GB para ~180MB),
  // elimina a necessidade de copiar todo o `node_modules` de desenvolvimento para o estágio
  // final (runner) e acelera o boot em notebooks Debian com recursos limitados.
  output: "standalone",

  // DECISÃO DE OPERAÇÃO OFFLINE (Sem internet):
  // `unoptimized: true` desativa a otimização dinâmica de imagens em tempo de execução,
  // evitando que o servidor tente buscar recursos externos na internet ou gravar cache
  // de imagens otimizadas em disco (essencial para o container `shop` com `read_only: true`).
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
