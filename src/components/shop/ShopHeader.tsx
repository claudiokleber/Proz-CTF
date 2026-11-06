"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  User,
  Package,
  Shield,
  Headphones,
  Settings,
  LogOut,
  Info,
} from "lucide-react";

export interface ShopUserClient {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

export function getShopToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("proz_shop_token");
}

export function getShopCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("proz_shop_cart");
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function saveShopCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("proz_shop_cart", JSON.stringify(items));
  window.dispatchEvent(new Event("proz-cart-updated"));
}

export function addToShopCart(product: {
  id: string;
  name: string;
  price: number;
  image: string;
}) {
  const cart = getShopCart();
  const existing = cart.find((c) => c.productId === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      image: product.image,
      quantity: 1,
    });
  }
  saveShopCart(cart);
}

export default function ShopHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<ShopUserClient | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");

  const loadShopSession = useCallback(async () => {
    const token = getShopToken();
    try {
      const res = await fetch("/api/loja/me", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      const data = await res.json();
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    }
  }, []);

  const syncCartCount = useCallback(() => {
    const items = getShopCart();
    setCartCount(items.reduce((acc, item) => acc + item.quantity, 0));
  }, []);

  useEffect(() => {
    loadShopSession();
    syncCartCount();

    window.addEventListener("proz-cart-updated", syncCartCount);
    window.addEventListener("proz-auth-updated", loadShopSession);
    return () => {
      window.removeEventListener("proz-cart-updated", syncCartCount);
      window.removeEventListener("proz-auth-updated", loadShopSession);
    };
  }, [loadShopSession, syncCartCount]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchTerm.trim();
    if (q) {
      router.push(`/loja?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/loja");
    }
  }

  async function handleLogout() {
    localStorage.removeItem("proz_shop_token");
    await fetch("/api/loja/auth/logout", { method: "POST" });
    setUser(null);
    window.dispatchEvent(new Event("proz-auth-updated"));
    router.push("/loja");
  }

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800">
      {/* Barra superior informativa */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-xs text-amber-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span>
            ⚡ <strong>Proz Store</strong> — Frete expresso para todo o Brasil ·
            Use o cupom <code className="font-mono font-bold">BEMVINDO10</code>{" "}
            na primeira compra!
          </span>
          <Link
            href="/ctf/desafios"
            className="inline-flex items-center gap-1 font-semibold text-emerald-300 hover:text-emerald-200"
          >
            <Shield className="w-3.5 h-3.5" />
            Voltar à Plataforma CTF
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/loja" className="flex items-center gap-2.5 shrink-0">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-extrabold text-white tracking-tight">
                Proz<span className="text-amber-400">Store</span>
              </span>
              <span className="block text-[10px] text-slate-400 -mt-1">
                Hardware & Tecnologia
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 text-sm">
            <Link
              href="/loja"
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              Catálogo
            </Link>
            <Link
              href="/loja/sobre"
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition inline-flex items-center gap-1.5"
            >
              <Info className="w-4 h-4 text-slate-400" />
              Sobre Nós
            </Link>
            {user && (
              <Link
                href="/loja/meus-pedidos"
                className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition inline-flex items-center gap-1.5"
              >
                <Package className="w-4 h-4 text-slate-400" />
                Meus Pedidos
              </Link>
            )}
            {(user?.role === "suporte" || user?.role === "admin") && (
              <Link
                href="/loja/suporte"
                className="px-3 py-1.5 rounded-lg text-cyan-300 hover:bg-cyan-950/60 transition inline-flex items-center gap-1.5 font-medium"
              >
                <Headphones className="w-4 h-4" />
                Painel Suporte
              </Link>
            )}
            {user?.role === "admin" && (
              <Link
                href="/loja/admin"
                className="px-3 py-1.5 rounded-lg text-rose-300 hover:bg-rose-950/60 transition inline-flex items-center gap-1.5 font-semibold"
              >
                <Settings className="w-4 h-4" />
                Admin Loja
              </Link>
            )}
          </nav>
        </div>

        {/* Busca */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar notebooks, periféricos, redes..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </form>

        {/* Ações do usuário e carrinho */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/loja/carrinho"
            className="relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
          >
            <ShoppingCart className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Carrinho</span>
            {cartCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[10px]">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-1.5">
              <Link
                href="/loja/perfil"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                <User className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">{user.name.split(" ")[0]}</span>
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-950 text-amber-300 border border-slate-700">
                  {user.role}
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                title="Sair da loja"
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/loja/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
            >
              <User className="w-4 h-4" />
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
