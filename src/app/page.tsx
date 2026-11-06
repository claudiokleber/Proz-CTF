import Link from "next/link";
import { Shield, ShoppingBag, Trophy, Lock, Terminal } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-between p-6 md:p-12">
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Proz <span className="text-emerald-400">CTF</span>
            </h1>
            <p className="text-xs text-slate-400">
              Escola Técnica Proz · Laboratório de Segurança Digital
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/ctf/placar"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-sm font-medium border border-slate-700 transition"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            Placar ao Vivo
          </Link>
        </div>
      </header>

      <section className="max-w-6xl w-full mx-auto my-12">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 mb-4">
            <Terminal className="w-3.5 h-3.5" />
            Capture The Flag · 17 Desafios Práticos
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Dois ambientes, uma missão:{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              encontrar as 17 falhas
            </span>
          </h2>
          <p className="text-slate-300 text-base md:text-lg">
            Organize sua equipe na <strong>Plataforma CTF</strong>, investigue a{" "}
            <strong>Proz Store (Loja Alvo)</strong> usando apenas o navegador e o
            DevTools (F12), e submeta as flags capturadas para subir no placar.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Card 1: Plataforma CTF (Segura) */}
          <div className="rounded-2xl bg-slate-900/90 border border-emerald-500/30 p-8 flex flex-col justify-between shadow-2xl shadow-emerald-950/20">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Shield className="w-8 h-8" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700/50 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Ambiente Seguro (`platform`)
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                1. Plataforma CTF & Equipes
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Crie sua conta, monte sua equipe ou entre com código de convite,
                leia os enunciados e dicas dos 17 desafios, envie as flags no
                formato <code className="text-emerald-300">CTF&#123;proz_...&#125;</code> e
                acompanhe o placar em tempo real.
              </p>
              <ul className="space-y-2 text-xs text-slate-400 mb-8">
                <li>• 17 desafios divididos em Fácil, Médio e Difícil (2.275 pts)</li>
                <li>• Pontuação por equipe com desempate por tempo do último acerto</li>
                <li>• Painel administrativo para instrutores gerenciarem o evento</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/ctf"
                className="flex-1 text-center px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition"
              >
                Acessar Plataforma CTF →
              </Link>
              <Link
                href="/ctf/desafios"
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition"
              >
                Ver Desafios
              </Link>
            </div>
          </div>

          {/* Card 2: Loja Alvo (Vulnerável) */}
          <div className="rounded-2xl bg-slate-900/90 border border-amber-500/30 p-8 flex flex-col justify-between shadow-2xl shadow-amber-950/20">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-700/50">
                  🎯 Alvo de Testes (`shop`)
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                2. Proz Store (Loja Alvo)
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                E-commerce fictício de tecnologia que esconde 17 vulnerabilidades
                controladas: exposição de dados, IDOR, falhas de lógica no
                checkout e cupons, XSS, manipulação de JWT e Prompt Injection no
                chatbot.
              </p>
              <ul className="space-y-2 text-xs text-slate-400 mb-8">
                <li>• Conta de cliente para testes: <code className="text-amber-300">joao.lima@proz.com</code> / <code className="text-amber-300">joao2024</code></li>
                <li>• Banco de dados 100% isolado da Plataforma CTF</li>
                <li>• Nenhuma ferramenta externa necessária — use apenas o navegador (F12)</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/loja"
                className="flex-1 text-center px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition"
              >
                Abrir Proz Store (Alvo) →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="max-w-6xl w-full mx-auto border-t border-slate-800/80 pt-6 text-center text-xs text-slate-500">
        Proz CTF · Ambiente Educacional Isolado · Escola Técnica Proz
      </footer>
    </main>
  );
}
