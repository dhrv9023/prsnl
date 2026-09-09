import { Link, useLocation } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { 
  Compass, 
  ArrowLeft, 
  Home, 
  FileText, 
  MessageSquare, 
  PenTool, 
  Headphones, 
  LayoutDashboard 
} from "lucide-react";

const quickLinks = [
  {
    name: "Resume Analysis",
    description: "ATS scoring, section critique & hiring intelligence",
    href: "/resume-analysis",
    icon: FileText,
  },
  {
    name: "AI Mock Interview",
    description: "Practice with adaptive questions and voice input",
    href: "/interview",
    icon: MessageSquare,
  },
  {
    name: "Cover Letter Generator",
    description: "AI-crafted cover letters tailored to your target role",
    href: "/cover-letter",
    icon: PenTool,
  },
  {
    name: "Contact Support",
    description: "Get help from our team or report an issue",
    href: "/contact",
    icon: Headphones,
  },
];

export default function NotFound() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col justify-center pt-28 pb-20 px-4 sm:px-6">
        <div className="container max-w-3xl mx-auto text-center">
          {/* Visual Indicator */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 mb-6 animate-pulse">
            <Compass className="w-8 h-8 text-accent" />
          </div>

          {/* 404 Gradient Number */}
          <div className="mb-4">
            <span className="text-7xl sm:text-8xl md:text-9xl font-extrabold tracking-tighter bg-gradient-to-br from-foreground via-foreground/80 to-muted-foreground/30 bg-clip-text text-transparent font-mono">
              404
            </span>
          </div>

          {/* Title & Description */}
          <h1 className="heading-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Lost in Career Cyberspace?
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto leading-relaxed mb-6">
            The page you're searching for might have moved, been renamed, or doesn't exist.
          </p>

          {/* Path Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/80 border border-border/40 text-xs font-mono text-muted-foreground mb-8 max-w-full truncate">
            <span className="text-accent">GET</span>
            <span className="truncate">{location.pathname}</span>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex h-11 items-center justify-center gap-2 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Home className="w-4 h-4" />
              Return to Home
            </Link>
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex h-11 items-center justify-center gap-2 px-6 rounded-xl bg-secondary border border-border/40 text-foreground text-sm font-semibold hover:bg-secondary/70 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Go to Dashboard
            </Link>
          </div>

          {/* Helpful Navigation Grid */}
          <div className="border-t border-border/30 pt-10 text-left">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60 text-center mb-6">
              Or Jump Directly Into Our Core Tools
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {quickLinks.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="group p-4 rounded-xl border border-border/30 bg-card/40 hover:bg-card/70 hover:border-border/60 transition-all duration-200 flex items-start gap-3.5"
                >
                  <div className="p-2.5 rounded-lg bg-secondary/60 text-accent group-hover:bg-accent/15 group-hover:text-accent transition-colors shrink-0">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
