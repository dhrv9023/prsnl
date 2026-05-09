import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoastModeProvider } from "@/contexts/RoastModeContext";
import { Loader2 } from "lucide-react";

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PricingPage = lazy(() => import("./pages/Pricing"));
const ResumeAnalysis = lazy(() => import("./pages/ResumeAnalysis"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AIInterview = lazy(() => import("./pages/AIInterview"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const CoverLetter = lazy(() => import("./pages/CoverLetter"));

const queryClient = new QueryClient();

// A full-screen loader for page transitions
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
        <RoastModeProvider>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/resume-analysis" element={<ResumeAnalysis />} />
                <Route path="/interview" element={<AIInterview />} />
                <Route path="/cover-letter" element={<CoverLetter />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </RoastModeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
