import { Link } from "wouter";
import {
  Timer, Target, Briefcase, BarChart2, CalendarDays, Zap,
  CheckCircle2, Star, ArrowRight, Shield, Globe2
} from "lucide-react";

const BENEFITS = [
  { icon: Timer, title: "Timer inteligente", desc: "Rastreie o tempo de cada tarefa com precisão. Play, pausa, stop e reinício em um clique." },
  { icon: Target, title: "Metas com acompanhamento", desc: "Defina metas numéricas e veja seu progresso em tempo real com alertas de risco." },
  { icon: Briefcase, title: "Gestão de projetos", desc: "Organize projetos com marcos, checklist e cor personalizada. Tudo em um lugar." },
  { icon: BarChart2, title: "Visão anual", desc: "Mapa de calor estilo GitHub mostrando sua produtividade ao longo de 365 dias." },
  { icon: CalendarDays, title: "Planejamento semanal", desc: "Visualize e reorganize sua semana com navegação simples e intuitiva." },
  { icon: Zap, title: "Adição rápida", desc: "Crie tarefas com linguagem natural. Digite 'amanhã às 21h P1' e pronto." },
];

const FEATURES = [
  { title: "Kanban e Lista", desc: "Alterne entre visão Kanban e lista para trabalhar do jeito que preferir.", badge: "Popular" },
  { title: "Setores personalizados", desc: "Separe suas tarefas por setor: Pessoal, Empresarial, Novos Projetos e muito mais." },
  { title: "Timer por sessão", desc: "Cada sessão de trabalho é registrada. Veja exatamente onde seu tempo vai." },
  { title: "Tarefas de hoje", desc: "Foco no que importa agora. Veja apenas as tarefas do dia e as atrasadas." },
];

const PLANS = [
  {
    name: "Gratuito",
    price: "R$ 0",
    period: "/mês",
    highlight: false,
    features: [
      "Uso pessoal",
      "Até 50 tarefas ativas",
      "Timer básico",
      "Dashboard",
      "Visão anual",
    ],
    cta: "Começar grátis",
    href: "/sign-up",
  },
  {
    name: "Profissional",
    price: "R$ 29",
    period: "/mês",
    highlight: true,
    features: [
      "Tudo do Gratuito",
      "Tarefas ilimitadas",
      "Até 4 membros de equipe",
      "Integrações Google",
      "Relatórios avançados",
    ],
    cta: "Começar agora",
    href: "/sign-up",
  },
  {
    name: "Corporativo",
    price: "R$ 79",
    period: "/mês",
    highlight: false,
    features: [
      "Tudo do Profissional",
      "Até 10 membros",
      "Suporte prioritário",
      "SLA garantido",
      "Onboarding dedicado",
    ],
    cta: "Falar com vendas",
    href: "/sign-up",
  },
  {
    name: "Personalizado",
    price: "Sob consulta",
    period: "",
    highlight: false,
    features: [
      "Membros ilimitados",
      "Integrações exclusivas",
      "Suporte 24/7",
      "Treinamento da equipe",
      "Contrato personalizado",
    ],
    cta: "Entrar em contato",
    href: "/sign-up",
  },
];

const TESTIMONIALS = [
  {
    name: "Marina Alves",
    role: "Empreendedora",
    text: "O Audaz LifeHub transformou minha rotina. Consigo ver tudo em um lugar e o timer me ajuda a entender onde meu tempo realmente vai.",
    stars: 5,
  },
  {
    name: "Rafael Torres",
    role: "Gerente de Projetos",
    text: "Migrei do Notion e do Todoist para o Audaz. A visão anual de produtividade é simplesmente viciante. Recomendo demais.",
    stars: 5,
  },
  {
    name: "Camila Santos",
    role: "Consultora de Marketing",
    text: "A adição rápida com linguagem natural em português é um diferencial enorme. Finalmente um app que entende como a gente pensa.",
    stars: 5,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--surface-1)] bg-[var(--surface-0)]/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Audaz Logo" className="h-8 w-8" />
            <h1 className="font-serif text-xl font-bold text-[#C9A84C]">Audaz LifeHub</h1>
          </div>
          <div className="flex items-center gap-3">
            <a href="/sign-in" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-medium">
              Entrar
            </a>
            <a
              href="/sign-up"
              className="px-4 py-2 bg-[#C9A84C] text-[var(--surface-0)] font-bold rounded-lg hover:bg-[#E2C06E] transition-colors text-sm"
            >
              Começar grátis
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--surface-1)] border border-[var(--surface-2)] text-xs text-[#C9A84C] font-medium mb-8">
          <Zap className="h-3.5 w-3.5" />
          Produtividade de alta performance em português
        </div>
        <h2 className="text-5xl md:text-7xl font-serif font-bold text-[var(--text-primary)] mb-6 leading-tight">
          Organize sua vida.<br />
          <span className="text-[#C9A84C]">Execute com precisão.</span>
        </h2>
        <p className="text-lg md:text-xl text-[var(--text-muted)] mb-10 max-w-2xl mx-auto leading-relaxed">
          Domine seu tempo, organize seus projetos e atinja suas metas.
          Um sistema denso, focado e poderoso — feito para quem leva a produtividade a sério.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/sign-up"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-[#C9A84C] text-[var(--surface-0)] font-bold rounded-xl hover:bg-[#E2C06E] transition-all text-lg shadow-lg shadow-[#C9A84C]/20 hover:shadow-[#C9A84C]/30"
          >
            Começar gratuitamente
            <ArrowRight className="h-5 w-5" />
          </a>
          <a
            href="/sign-in"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-transparent text-[#C9A84C] font-bold rounded-xl border border-[#C9A84C]/40 hover:border-[#C9A84C] hover:bg-[#C9A84C]/5 transition-all text-lg"
          >
            Já tenho conta
          </a>
        </div>
        <p className="mt-4 text-xs text-[var(--text-subtle)]">Gratuito para começar. Sem cartão de crédito.</p>
      </section>

      {/* Benefícios */}
      <section className="bg-[var(--surface-1)] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-[var(--text-primary)] mb-3">
              Tudo que você precisa para produzir mais
            </h2>
            <p className="text-[var(--text-muted)] max-w-xl mx-auto">
              Ferramentas poderosas integradas em uma experiência única e sem distrações.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((b) => (
              <div key={b.title} className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--surface-1)] hover:border-[#C9A84C]/30 transition-all group">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C9A84C]/10 text-[#C9A84C] mb-4 group-hover:bg-[#C9A84C]/20 transition-colors">
                  <b.icon className="h-5 w-5" />
                </div>
                <h3 className="font-serif font-bold text-[var(--text-primary)] text-lg mb-2">{b.title}</h3>
                <p className="text-[var(--text-muted)] text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-[var(--text-primary)] mb-3">
              Funcionalidades que fazem a diferença
            </h2>
            <p className="text-[var(--text-muted)]">Cada detalhe foi pensado para eliminar fricção e maximizar foco.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4 p-6 bg-[var(--surface-1)] rounded-xl border border-[var(--surface-2)]">
                <div className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-[#C9A84C]/10 text-[#C9A84C] mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[var(--text-primary)]">{f.title}</h3>
                    {f.badge && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-[#C9A84C]/20 text-[#C9A84C] font-medium">{f.badge}</span>
                    )}
                  </div>
                  <p className="text-[var(--text-muted)] text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="bg-[var(--surface-1)] py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-[var(--text-primary)] mb-4">
            Por que Audaz e não Todoist ou Notion?
          </h2>
          <p className="text-[var(--text-muted)] mb-10 text-lg">
            O Audaz foi construído para quem já tentou tudo e quer algo que realmente funcione.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Globe2, title: "100% em português", desc: "Interface, linguagem natural, datas e tudo mais em PT-BR nativo." },
              { icon: Shield, title: "Seus dados, sua privacidade", desc: "Nada de anúncios ou venda de dados. Você paga pelo produto, não é o produto." },
              { icon: Zap, title: "Foco no que importa", desc: "Sem recursos desnecessários. Só o que você precisa para executar com precisão." },
            ].map((d) => (
              <div key={d.title} className="p-6 bg-[var(--surface-0)] rounded-xl border border-[var(--surface-2)]">
                <d.icon className="h-8 w-8 text-[#C9A84C] mb-3 mx-auto" />
                <h3 className="font-serif font-bold text-[var(--text-primary)] mb-2">{d.title}</h3>
                <p className="text-sm text-[var(--text-muted)]">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-[var(--text-primary)] mb-3">Planos</h2>
            <p className="text-[var(--text-muted)]">Comece de graça. Evolua quando precisar.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-6 border flex flex-col ${
                  plan.highlight
                    ? "bg-[#C9A84C]/10 border-[#C9A84C] shadow-lg shadow-[#C9A84C]/10"
                    : "bg-[var(--surface-1)] border-[var(--surface-2)]"
                }`}
              >
                {plan.highlight && (
                  <div className="text-xs text-[#C9A84C] font-bold uppercase tracking-widest mb-2">Mais popular</div>
                )}
                <h3 className="font-serif font-bold text-[var(--text-primary)] text-lg">{plan.name}</h3>
                <div className="mt-2 mb-6">
                  <span className="text-3xl font-bold text-[var(--text-primary)]">{plan.price}</span>
                  <span className="text-[var(--text-muted)] text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                      <CheckCircle2 className="h-4 w-4 text-[#C9A84C] shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.href}
                  className={`block text-center py-2.5 px-4 rounded-lg font-bold text-sm transition-all ${
                    plan.highlight
                      ? "bg-[#C9A84C] text-[var(--surface-0)] hover:bg-[#E2C06E]"
                      : "border border-[#C9A84C]/40 text-[#C9A84C] hover:bg-[#C9A84C]/10"
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="bg-[var(--surface-1)] py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-[var(--text-primary)] mb-3">O que dizem nossos usuários</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--surface-1)]">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-[#C9A84C]" fill="currentColor" />
                  ))}
                </div>
                <p className="text-[var(--text-muted)] text-sm italic mb-4 leading-relaxed">"{t.text}"</p>
                <div>
                  <p className="text-[var(--text-primary)] font-semibold text-sm">{t.name}</p>
                  <p className="text-[var(--text-subtle)] text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-[var(--text-primary)] mb-6">
            Comece agora — é grátis
          </h2>
          <p className="text-[var(--text-muted)] text-lg mb-10">
            Leva menos de 1 minuto para criar sua conta e começar a transformar sua produtividade.
          </p>
          <a
            href="/sign-up"
            className="inline-flex items-center gap-2 px-10 py-5 bg-[#C9A84C] text-[var(--surface-0)] font-bold rounded-xl hover:bg-[#E2C06E] transition-all text-xl shadow-xl shadow-[#C9A84C]/20"
          >
            Criar conta gratuita
            <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--surface-1)] py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Audaz Logo" className="h-6 w-6" />
            <span className="font-serif font-bold text-[#C9A84C]">Audaz LifeHub</span>
          </div>
          <div className="flex gap-6 text-sm text-[var(--text-subtle)]">
            <a href="#planos" className="hover:text-[var(--text-primary)] transition-colors">Planos</a>
            <a href="/sign-in" className="hover:text-[var(--text-primary)] transition-colors">Entrar</a>
            <a href="/sign-up" className="hover:text-[var(--text-primary)] transition-colors">Criar conta</a>
          </div>
          <p className="text-xs text-[var(--text-subtle)]">
            © {new Date().getFullYear()} Audaz LifeHub. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
