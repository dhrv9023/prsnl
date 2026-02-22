import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/lib/auth";
import {
  Menu,
  X,
  LogOut,
  BarChart3,
  FileText,
  Flame,
  PenTool,
  BriefcaseBusiness,
  Lock,
} from "lucide-react";

const navLinks = [
  { name: "Home", href: "#" },
  { name: "Pricing", href: "/pricing" },
  { name: "Contact", href: "#contact" },
];

const features = [
  {
    icon: BarChart3,
    name: "Resume Analyzer",
    description: "ATS score & AI-powered resume analysis",
    href: "/resume-analysis",
    active: true,
  },
  {
    icon: PenTool,
    name: "Cover Letter Generator",
    description: "AI-crafted cover letters from your resume",
    href: null,
    active: false,
  },
  {
    icon: BriefcaseBusiness,
    name: "Interview Prep",
    description: "Practice with AI-generated questions",
    href: null,
    active: false,
  },
  {
    icon: FileText,
    name: "Career Roadmap",
    description: "Personalized career growth planning",
    href: null,
    active: false,
  },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const { isAuthenticated, logout, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleFeatureClick = (feature: (typeof features)[0]) => {
    if (!feature.active || !feature.href) return;
    if (!isAuthenticated) {
      navigate("/auth", { state: { from: feature.href } });
    } else {
      navigate(feature.href);
    }
    setIsFeaturesOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "glass border-b border-border/50" : ""
        }`}
    >
      <nav className="container flex items-center justify-between h-16 md:h-20">
        {/* Logo */}
        <Link to="/" className="text-xl font-semibold tracking-tight">
          KAREERIST
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <a
            href="#"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors link-underline"
          >
            Home
          </a>

          {/* Features Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setIsFeaturesOpen(true)}
            onMouseLeave={() => setIsFeaturesOpen(false)}
          >
            <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors link-underline flex items-center gap-1">
              Features
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${isFeaturesOpen ? "rotate-180" : ""
                  }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            <AnimatePresence>
              {isFeaturesOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute top-full left-1/2 -translate-x-1/2 pt-3"
                >
                  <div className="w-[380px] rounded-xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] overflow-hidden">
                    <div className="p-2">
                      {features.map((feature) => (
                        <button
                          key={feature.name}
                          onClick={() => handleFeatureClick(feature)}
                          disabled={!feature.active}
                          className={`w-full flex items-start gap-3.5 p-3 rounded-lg text-left transition-all duration-200 group ${feature.active
                              ? "hover:bg-secondary/60 cursor-pointer"
                              : "opacity-45 cursor-not-allowed"
                            }`}
                        >
                          <div
                            className={`mt-0.5 p-2 rounded-lg border transition-colors duration-200 ${feature.active
                                ? "border-border/50 bg-secondary/50 group-hover:border-accent/30 group-hover:bg-accent/10"
                                : "border-border/30 bg-secondary/30"
                              }`}
                          >
                            <feature.icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {feature.name}
                              </span>
                              {!feature.active && (
                                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 bg-secondary/50 px-1.5 py-0.5 rounded">
                                  Soon
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground/70 mt-0.5 leading-relaxed">
                              {feature.description}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <a
            href="/pricing"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors link-underline"
          >
            Pricing
          </a>
          <a
            href="#contact"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors link-underline"
          >
            Contact
          </a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {!isLoading && isAuthenticated ? (
            <button
              onClick={logout}
              className="hidden md:inline-flex items-center justify-center gap-2 h-10 px-5 text-sm font-medium bg-secondary text-foreground rounded-full hover:bg-secondary/80 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          ) : (
            <Link
              to="/auth"
              className="hidden md:inline-flex items-center justify-center h-10 px-5 text-sm font-medium bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden glass border-t border-border/50"
        >
          <div className="container py-6 flex flex-col gap-4">
            <a
              href="#"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Home
            </a>

            {/* Mobile Features */}
            <div className="space-y-1">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 px-1 pb-1">
                Features
              </p>
              {features.map((feature) => (
                <button
                  key={feature.name}
                  onClick={() => handleFeatureClick(feature)}
                  disabled={!feature.active}
                  className={`w-full flex items-center gap-3 py-2.5 px-1 text-left transition-colors ${feature.active
                      ? "text-foreground"
                      : "text-muted-foreground/40 cursor-not-allowed"
                    }`}
                >
                  <feature.icon className="w-4 h-4" />
                  <span className="text-base font-medium">{feature.name}</span>
                  {!feature.active && (
                    <Lock className="w-3 h-3 ml-auto text-muted-foreground/30" />
                  )}
                </button>
              ))}
            </div>

            <a
              href="/pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Pricing
            </a>
            <a
              href="#contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Contact
            </a>

            {!isLoading && isAuthenticated ? (
              <button
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
                className="inline-flex items-center justify-center gap-2 h-12 px-6 text-sm font-medium bg-secondary text-foreground rounded-full hover:bg-secondary/80 transition-colors mt-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            ) : (
              <Link
                to="/auth"
                onClick={() => setIsMobileMenuOpen(false)}
                className="inline-flex items-center justify-center h-12 px-6 text-sm font-medium bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity mt-2"
              >
                Get Started
              </Link>
            )}
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}