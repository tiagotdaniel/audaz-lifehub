import { useEffect, useRef, useState } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useAuth } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { setAuthTokenGetter, getGetProductivityStatsQueryKey } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/ThemeContext";

import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import Hoje from "@/pages/Hoje";
import Planejamento from "@/pages/Planejamento";
import Anual from "@/pages/Anual";
import Concluidas from "@/pages/Concluidas";
import Metas from "@/pages/Metas";
import Projetos from "@/pages/Projetos";
import Configuracoes from "@/pages/Configuracoes";
import Listas from "@/pages/Listas";
import Financas from "@/pages/Financas";
import Shape from "@/pages/Shape";
import MuralDosSonhos from "@/pages/MuralDosSonhos";
import Documentos from "@/pages/Documentos";
import AppLayout from "@/components/layout/AppLayout";
import FloatingTimer from "@/components/layout/FloatingTimer";
import QuickAddModal from "@/components/tasks/QuickAddModal";
import ProductivityQuestionnaireModal from "@/components/ProductivityQuestionnaireModal";
import NotFound from "@/pages/not-found";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#C9A84C",
    colorForeground: "#F0EBE3",
    colorMutedForeground: "#A89880",
    colorDanger: "#E53E3E",
    colorBackground: "#1A2B42",
    colorInput: "#162236",
    colorInputForeground: "#F0EBE3",
    colorNeutral: "#162236",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[var(--surface-2)] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-[var(--surface-1)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none bg-[var(--surface-1)]",
    headerTitle: "text-[var(--text-primary)] font-serif font-bold text-2xl",
    headerSubtitle: "text-[var(--text-muted)]",
    socialButtonsBlockButtonText: "text-[var(--text-primary)] font-medium",
    formFieldLabel: "text-[var(--text-muted)] font-medium",
    footerActionLink: "text-[#C9A84C] hover:text-[#E2C06E]",
    footerActionText: "text-[var(--text-muted)]",
    dividerText: "text-[var(--text-muted)]",
    identityPreviewEditButton: "text-[#C9A84C]",
    formFieldSuccessText: "text-[#38A169]",
    alertText: "text-[var(--text-primary)]",
    logoImage: "h-12 w-auto",
    socialButtonsBlockButton: "bg-[var(--surface-1)] border-[var(--surface-2)] hover:bg-[var(--surface-0)] transition-colors",
    formButtonPrimary: "bg-[#C9A84C] hover:bg-[#E2C06E] text-[var(--surface-0)] font-bold font-sans",
    formFieldInput: "bg-[var(--surface-0)] border-[var(--surface-1)] text-[var(--text-primary)] focus:ring-[#C9A84C]",
    dividerLine: "bg-[var(--surface-1)]",
    alert: "bg-[var(--surface-0)] border border-[#E53E3E]",
  },
};

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--surface-0)] px-4 font-sans">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--surface-0)] px-4 font-sans">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <AppLayout>
          <Component />
        </AppLayout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ClerkAuthSetup() {
  const { getToken, isSignedIn } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  useEffect(() => {
    if (!isSignedIn) return;
    (async () => {
      const token = await getToken();
      await fetch("/api/streak/ping", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    })();
  }, [isSignedIn, getToken]);

  return null;
}

function FirstLoginOnboarding() {
  const { getToken, isSignedIn } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (!isSignedIn) return;
    (async () => {
      const token = await getToken();
      const res = await fetch("/api/productivity-profile", { headers: { Authorization: `Bearer ${token}` } });
      const profile = await res.json();
      if (!profile) setShowOnboarding(true);
    })();
  }, [isSignedIn, getToken]);

  return (
    <ProductivityQuestionnaireModal
      open={showOnboarding}
      onClose={() => setShowOnboarding(false)}
      onSaved={() => qc.invalidateQueries({ queryKey: getGetProductivityStatsQueryKey() })}
    />
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

export const OPEN_QUICKADD_EVENT = "audaz:open-quickadd";

function GlobalQuickAddModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "t") {
        e.preventDefault();
        setOpen(true);
      }
    };
    const openHandler = () => setOpen(true);
    window.addEventListener("keydown", handler);
    window.addEventListener(OPEN_QUICKADD_EVENT, openHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener(OPEN_QUICKADD_EVENT, openHandler);
    };
  }, []);

  return <QuickAddModal open={open} onClose={() => setOpen(false)} />;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkAuthSetup />
        <ClerkQueryClientCacheInvalidator />
        <FirstLoginOnboarding />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
            <Route path="/tasks"><ProtectedRoute component={Tasks} /></Route>
            <Route path="/hoje"><ProtectedRoute component={Hoje} /></Route>
            <Route path="/atrasadas"><Redirect to="/tasks" /></Route>
            <Route path="/planejamento"><ProtectedRoute component={Planejamento} /></Route>
            <Route path="/anual"><ProtectedRoute component={Anual} /></Route>
            <Route path="/concluidas"><ProtectedRoute component={Concluidas} /></Route>
            <Route path="/metas"><ProtectedRoute component={Metas} /></Route>
            <Route path="/listas"><ProtectedRoute component={Listas} /></Route>
            <Route path="/financas"><ProtectedRoute component={Financas} /></Route>
            <Route path="/shape"><ProtectedRoute component={Shape} /></Route>
            <Route path="/mural"><ProtectedRoute component={MuralDosSonhos} /></Route>
            <Route path="/documentos"><ProtectedRoute component={Documentos} /></Route>
            <Route path="/projetos"><ProtectedRoute component={Projetos} /></Route>
            <Route path="/configuracoes"><ProtectedRoute component={Configuracoes} /></Route>
            <Route component={NotFound} />
          </Switch>
          <FloatingTimer />
          <GlobalQuickAddModal />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </ThemeProvider>
  );
}

export default App;
