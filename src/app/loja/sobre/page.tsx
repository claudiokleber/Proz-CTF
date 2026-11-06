import { Building2, Award, ShieldCheck, Users } from "lucide-react";

export default function ShopAboutPage() {
  // ⚠️ VULN #9 — Senha fácil de adivinhar (Autenticação fraca / Senha baseada em dados públicos)
  // A página institucional revela o nome da empresa ("Proz") e o ano de fundação ("2010"),
  // além de mencionar a convenção de acesso padrão da equipe interna de suporte.
  // A conta `suporte@proz.com` utiliza literalmente a senha fraca `proz2010`.
  // Correção real: exigir política de senhas fortes e aleatórias, bloquear senhas
  // baseadas no nome da empresa/datas públicas e adotar autenticação multifator (MFA).
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div className="text-center space-y-3">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <Building2 className="w-3.5 h-3.5" />
          Institucional · Fundada em 2010
        </span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white">
          Proz, tecnologia em que você confia desde 2010
        </h1>
        <p className="text-slate-400 text-base max-w-2xl mx-auto">
          Mais de uma década conectando estudantes, laboratórios e profissionais
          às melhores ferramentas de tecnologia.
        </p>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 space-y-6 text-slate-300 text-sm leading-relaxed">
        <p>
          Fundada em <strong>2010</strong>, a <strong>Proz</strong> nasceu como
          uma iniciativa dedicada a fornecer equipamentos de computação, redes e
          periféricos de alta durabilidade com condições especiais para a
          comunidade acadêmica e profissional.
        </p>
        <p>
          Nosso lema,{" "}
          <em>&ldquo;Proz, tecnologia em que você confia desde 2010&rdquo;</em>,
          inspira até hoje nossa cultura interna — inclusive nos treinamentos da
          nossa bancada de atendimento (<code className="text-amber-300">suporte@proz.com</code>),
          onde novos atendentes iniciam suas atividades utilizando a credencial
          padrão que combina o nome da empresa em letras minúsculas seguido do
          nosso ano de fundação.
        </p>

        <div className="grid sm:grid-cols-3 gap-4 pt-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <Award className="w-6 h-6 text-amber-400 mb-2" />
            <h3 className="font-bold text-white mb-1">História desde 2010</h3>
            <p className="text-xs text-slate-400">
              Tradição e parceria direta com fabricantes homologados desde a
              fundação da Proz em 2010.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <Users className="w-6 h-6 text-cyan-400 mb-2" />
            <h3 className="font-bold text-white mb-1">Suporte Dedicado</h3>
            <p className="text-xs text-slate-400">
              Nossa equipe de atendimento (
              <code className="text-cyan-300">suporte@proz.com</code>) acompanha
              cada pedido de perto.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <ShieldCheck className="w-6 h-6 text-emerald-400 mb-2" />
            <h3 className="font-bold text-white mb-1">Compra Protegida</h3>
            <p className="text-xs text-slate-400">
              Processamento rápido e rastreamento completo em tempo real.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
