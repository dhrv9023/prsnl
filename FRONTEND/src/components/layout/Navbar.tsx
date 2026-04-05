import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AuthModal } from "@/components/ui/AuthModal";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  Menu,
  X,
  FileText,
  Target,
  MessageSquare,
  TrendingUp,
  Sparkles,
  PenTool,
  Search,
  FolderKanban,
  Users,
  Bot,
  Lock,
  LayoutDashboard,
  User,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";

const navLinks = [
  { name: "Home", href: "#" },
  { name: "Pricing", href: "/pricing" },
  { name: "Contact", href: "#contact" },
];

const features = [
  {
    icon: FileText,
    name: "Resume Analysis",
    description: "AI-powered resume review & feedback",
    href: "/resume-analysis",
    active: true,
  },
  {
    icon: Target,
    name: "ATS Scoring",
    description: "Check how your resume scores with ATS systems",
    href: null,
    active: false,
  },
  {
    icon: MessageSquare,
    name: "AI Mock Interviews",
    description: "Practice with AI-generated interview questions",
    href: null,
    active: false,
  },
  {
    icon: TrendingUp,
    name: "Career Roadmaps",
    description: "Personalized career growth planning",
    href: null,
    active: false,
  },
  {
    icon: Sparkles,
    name: "Resume Template Generator",
    description: "Generate polished resume templates instantly",
    href: null,
    active: false,
  },
  {
    icon: Search,
    name: "Job Description Analyzer",
    description: "Extract key requirements from any job posting",
    href: null,
    active: false,
  },
  {
    icon: PenTool,
    name: "Cover Letter Generator",
    description: "AI-crafted cover letters from your resume",
    href: null,
    active: false,
  },
  {
    icon: Sparkles,
    name: "AI Project Recommender",
    description: "Get project ideas to boost your portfolio",
    href: null,
    active: false,
  },
  {
    icon: Target,
    name: "Role Fit Score",
    description: "See how well you match a specific role",
    href: null,
    active: false,
  },
  {
    icon: FolderKanban,
    name: "Job Tracker",
    description: "Organize and track your job applications",
    href: null,
    active: false,
  },
  {
    icon: Users,
    name: "Resume Audit Marketplace",
    description: "Get expert human reviews on your resume",
    href: null,
    active: false,
  },
  {
    icon: Users,
    name: "Career Twin",
    description: "Find professionals with similar career paths",
    href: null,
    active: false,
  },
  {
    icon: Bot,
    name: "24x7 AI Chatbot",
    description: "Always-on AI career assistant",
    href: null,
    active: false,
  },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const auth = useAuthContext();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFeatureClick = (feature: (typeof features)[0]) => {
    if (!feature.active || !feature.href) return;
    setIsFeaturesOpen(false);
    setIsMobileMenuOpen(false);

    if (!auth.isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    navigate(feature.href);
  };

  const handleLogout = async () => {
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
    await auth.logout();
    navigate("/");
  };

  // Get user initial for avatar
  const userInitial = auth.user?.email?.[0]?.toUpperCase() || "U";

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
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors link-underline"
          >
            Home
          </Link>

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
                  <div className="w-[680px] rounded-xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] overflow-hidden">
                    <div className="p-3 max-h-[75vh] overflow-y-auto">
                      <div className="grid grid-cols-2 gap-1">
                        {features.map((feature) => (
                          <button
                            key={feature.name}
                            onClick={() => handleFeatureClick(feature)}
                            disabled={!feature.active}
                            className={`flex items-start gap-3.5 p-3.5 rounded-lg text-left transition-all duration-200 group ${feature.active
                              ? "hover:bg-secondary/60 cursor-pointer"
                              : "opacity-50 cursor-default"
                              }`}
                          >
                            <div
                              className={`mt-0.5 p-2.5 rounded-lg shrink-0 transition-colors duration-200 ${feature.active
                                ? "bg-accent/15 text-accent group-hover:bg-accent/25"
                                : "bg-secondary/60 text-muted-foreground/60"
                                }`}
                            >
                              <feature.icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">
                                  {feature.name}
                                </span>
                                {feature.active && (
                                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-400/15 px-1.5 py-0.5 rounded">
                                    Live
                                  </span>
                                )}
                                {!feature.active && (
                                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50 bg-secondary/60 px-1.5 py-0.5 rounded">
                                    Soon
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground/60 mt-0.5 leading-relaxed line-clamp-2">
                                {feature.description}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-border/30 px-4 py-2.5">
                      <Link
                        to="/"
                        onClick={() => setIsFeaturesOpen(false)}
                        className="flex items-center justify-end gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        All Features →
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link
            to="/pricing"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors link-underline"
          >
            Pricing
          </Link>
          <Link
            to="/#contact"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors link-underline"
          >
            Contact
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {/* Sign In Button — when logged out */}
          {!auth.isLoading && !auth.isAuthenticated && (
            <button
              onClick={() => setShowAuthModal(true)}
              className="hidden md:flex items-center justify-center h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Sign In
            </button>
          )}

          {/* Profile Avatar — only when authenticated */}
          {auth.isAuthenticated && auth.user && (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 group"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-primary/40 border border-border/50 flex items-center justify-center text-xs font-bold text-primary-foreground shadow-sm group-hover:shadow-md group-hover:shadow-primary/20 transition-all duration-200">
                  {userInitial}
                </div>
                <ChevronDown className={`w-3 h-3 text-muted-foreground/60 hidden md:block transition-transform duration-200 ${isProfileOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-[0_16px_40px_-8px_rgba(0,0,0,0.4)] overflow-hidden"
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-border/30">
                      <p className="text-sm font-medium text-foreground truncate">{auth.user.email}</p>
                      <p className="text-xs text-muted-foreground/50 mt-0.5">Kareerist Member</p>
                    </div>

                    {/* Menu items */}
                    <div className="py-1.5">
                      <button
                        onClick={() => { setIsProfileOpen(false); navigate("/dashboard"); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </button>
                      <button
                        disabled
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground/40 cursor-not-allowed"
                      >
                        <User className="w-4 h-4" />
                        Profile
                        <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-muted-foreground/30 bg-secondary/40 px-1.5 py-0.5 rounded">Soon</span>
                      </button>
                      <button
                        disabled
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground/40 cursor-not-allowed"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                        <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-muted-foreground/30 bg-secondary/40 px-1.5 py-0.5 rounded">Soon</span>
                      </button>
                    </div>

                    <div className="border-t border-border/30 py-1.5">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400/80 hover:text-red-400 hover:bg-red-400/5 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Home
            </Link>

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

            <Link
              to="/pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Pricing
            </Link>
            <Link
              to="/#contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Contact
            </Link>

            {/* Mobile auth section */}
            {auth.isAuthenticated && auth.user ? (
              <div className="border-t border-border/30 pt-4 mt-2 space-y-1">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 px-1 pb-1">
                  Account
                </p>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); navigate("/dashboard"); }}
                  className="w-full flex items-center gap-3 py-2.5 px-1 text-left text-foreground transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="text-base font-medium">Dashboard</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 py-2.5 px-1 text-left text-red-400/80 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-base font-medium">Sign out</span>
                </button>
              </div>
            ) : (
              <div className="border-t border-border/30 pt-4 mt-2">
                <button
                  onClick={() => { setIsMobileMenuOpen(false); setShowAuthModal(true); }}
                  className="w-full flex items-center justify-center h-11 rounded-lg bg-primary text-primary-foreground text-base font-medium hover:opacity-90 transition-opacity"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
      {/* Auth Modal overlay wrapper */}
      {!auth.isLoading && !auth.isAuthenticated && showAuthModal && (
        <AuthModal
          onSuccess={() => {
            setShowAuthModal(false);
            navigate("/dashboard");
          }}
          onClose={() => setShowAuthModal(false)}
          login={auth.login}
          signup={auth.signup}
          isSubmitting={auth.isSubmitting}
          error={auth.error}
          clearError={auth.clearError}
        />
      )}
    </motion.header>
  );
}