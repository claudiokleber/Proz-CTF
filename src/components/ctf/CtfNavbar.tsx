"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield,
  Flag,
  Trophy,
  Users,
  Settings,
  LogOut,
  ExternalLink,
  Activity,
} from "lucide-react";

export interface PlatformUserClient {
  id: string;
  name: string;
  email: string;
  role: string;
  teamId: string | null;
  team?: {
    id: string;
    name: string;
    inviteCode: string;
  } | null;
}

interface CtfNavbarProps {
  user: PlatformUserClient | null;
  eventoAtivo: boolean;
  onLogout?: () => void;
}

export default function CtfNavbar({
  user,
  eventoAtivo,
  onLogout,
}: CtfNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/ctf/auth/logout", { method: "POST" });
    if (onLogout) {
      onLogout();
    } else {
      router.push("/ctf");
      router.refresh();
    }
  }

  const navItems = [
    { href: "/ctf", label: "Minha Equipe", icon: Users },
    { href: "/ctf/desafios", label: "Desafios (17)", icon: Flag },
    { href: "/ctf/placar", label: "Placar", icon: Trophy },
  ];

  if (user?.role === "admin") {
    navItems.push({ href: "/ctf/admin", label: "Painel Admin", icon: Settings });
  }

  return (
    <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/ctf" className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white tracking-tight">
                Proz <span className="text-emerald-400">CTF</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Plataforma Segura
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                    active
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/70"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Indicador de status do evento */}
          <span
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              eventoAtivo
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/50"
                : "bg-rose-950/80 text-rose-300 border-rose-700/50"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            {eventoAtivo ? "Evento Ativo" : "Evento Pausado"}
          </span>

          {/* Botão para abrir a Loja Vulnerável */}
          <Link
            href="/loja"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition"
          >
            🎯 Loja Alvo
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right hidden lg:block">
                <div className="text-xs font-semibold text-white leading-tight">
                  {user.name}
                  {user.role === "admin" && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  {user.team ? `Equipe: ${user.team.name}` : "Sem equipe"}
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sair da conta"
                className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/ctf"
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition"
            >
              Entrar / Cadastrar
            </Link>
          )}
        </div>
      </div>

      {/* Menu mobile */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800/80 bg-slate-900/60 py-2 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                active
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
