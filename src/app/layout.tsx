import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proz CTF — Ambiente Educacional de Segurança Digital",
  description:
    "Plataforma CTF de Equipes e Loja E-commerce Alvo para a Escola Técnica Proz.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
