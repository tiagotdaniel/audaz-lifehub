import { useEffect, useRef, useState } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useAuth } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

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
import AppLayout from "@/components/layout/AppLayout";
import FloatingTimer from "@/components/layout/FloatingTimer";
import QuickAddModal from "@/components/tasks/QuickAddModal";
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
    cardBox: "bg-[#1A2B42] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-[#162236]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none bg-[#162236]",
    headerTitle: "text-[#F0EBE3] font-serif font-bold text-2xl",
    headerSubtitle: "text-[#A89880]",
    socialButtonsBlockButtonText: "text-[#F0EBE3] font-medium",
    formFieldLabel: "text-[#A89880] font-medium",
    footerActionLink: "text-[#C9A84C] hover:text-[#E2C06E]",
    footerActionText: "text-[#A89880]",
    dividerText: "text-[#A89880]",
    identityPreviewEditButton: "text-[#C9A84C]",
    formFieldSuccessText: "text-[#38A169]",
    alertText: "text-[#F0EBE3]",
    logoImage: "h-12 w-auto",
    socialButtonsBlockButton: "bg-[#162236] border-[#1A2B42] hover:bg-[#0D1B2A] transition-colors",
    formButtonPrimary: "bg-[#C9A84C] hover:bg-[#E2C06E] text-[#0D1B2A] font-bold font-sans",
    formFieldInput: "bg-[#0D1B2A] border-[#162236] text-[#F0EBE3] focus:ring-[#C9A84C]",
    dividerLine: "bg-[#162236]",
    alert: "bg-[#0D1B2A] border border-[#E53E3E]",
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
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0D1B2A] px-4 font-sans">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0D1B2A] px-4 font-sans">
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
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);
  return null;
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

function GlobalQuickAddModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
            <Route path="/tasks"><ProtectedRoute component={Tasks} /></Route>
            <Route path="/hoje"><ProtectedRoute component={Hoje} /></Route>
            <Route path="/planejamento"><ProtectedRoute component={Planejamento} /></Route>
            <Route path="/anual"><ProtectedRoute component={Anual} /></Route>
            <Route path="/concluidas"><ProtectedRoute component={Concluidas} /></Route>
            <Route path="/metas"><ProtectedRoute component={Metas} /></Route>
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
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
