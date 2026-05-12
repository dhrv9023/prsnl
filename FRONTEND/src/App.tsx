import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CreditProvider } from "@/contexts/CreditContext";
import { Loader2 } from "lucide-react";

// Retry dynamic imports — handles stale chunks after Vercel redeploys
function lazyWithRetry(importFn: () => Promise<{ default: React.ComponentType }>) {
  return lazy(() =>
    importFn().catch(() => {
      // Chunk is missing (new deploy invalidated old hashes) — reload once
      const hasReloaded = sessionStorage.getItem("chunk-reload");
      if (!hasReloaded) {
        sessionStorage.setItem("chunk-reload", "1");
        window.location.reload();
        return { default: () => null } as never;
      }
      sessionStorage.removeItem("chunk-reload");
      // If reload didn't fix it, show a fallback
      return { default: () => null } as { default: React.ComponentType };
    })
  );
}

// Lazy-loaded pages (with retry on chunk failure)
const Index = lazyWithRetry(() => import("./pages/Index"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const ResumeAnalysis = lazyWithRetry(() => import("./pages/ResumeAnalysis"));
const DashboardPage = lazyWithRetry(() => import("./pages/DashboardPage"));
const AIInterview = lazyWithRetry(() => import("./pages/AIInterview"));
const AuthCallback = lazyWithRetry(() => import("./pages/AuthCallback"));
const AdminPage = lazyWithRetry(() => import("./pages/AdminPage"));
const CoverLetter = lazyWithRetry(() => import("./pages/CoverLetter"));
const CreditsPage = lazyWithRetry(() => import("./pages/CreditsPage"));
const InterviewHistory = lazyWithRetry(() => import("./pages/InterviewHistory"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CreditProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/pricing" element={<NotFound />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/resume-analysis" element={<ResumeAnalysis />} />
                <Route path="/interview" element={<AIInterview />} />
                <Route path="/cover-letter" element={<CoverLetter />} />
                <Route path="/credits" element={<CreditsPage />} />
                <Route path="/interview/history" element={<InterviewHistory />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </CreditProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
