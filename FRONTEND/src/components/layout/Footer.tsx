import { Github, Twitter, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/50 dark:bg-background pt-16 pb-8">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="text-xl font-bold tracking-tight mb-6 block text-foreground">
              KAREERIST
            </Link>
            <p className="text-muted-foreground leading-relaxed max-w-sm mb-6">
              Kareerist is a structured career operating system built to replace scattered effort with measurable progress.
            </p>
            <div className="flex space-x-3">
              <a href="#" className="p-2.5 rounded-lg bg-secondary/60 dark:bg-secondary/40 text-foreground/60 hover:text-foreground hover:bg-secondary transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="p-2.5 rounded-lg bg-secondary/60 dark:bg-secondary/40 text-foreground/60 hover:text-foreground hover:bg-secondary transition-colors">
                <Github className="w-4 h-4" />
              </a>
              <a href="#" className="p-2.5 rounded-lg bg-secondary/60 dark:bg-secondary/40 text-foreground/60 hover:text-foreground hover:bg-secondary transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-6">Product</h4>
            <ul className="space-y-3.5 text-sm">
              <li><Link to="/resume-analysis" className="text-muted-foreground hover:text-foreground transition-colors">Resume Analysis</Link></li>
              <li><Link to="/interview" className="text-muted-foreground hover:text-foreground transition-colors">Interview Prep</Link></li>
              <li><Link to="/cover-letter" className="text-muted-foreground hover:text-foreground transition-colors">Cover Letter</Link></li>
              <li><Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-6">Company</h4>
            <ul className="space-y-3.5 text-sm">
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">About</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Blog</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Careers</a></li>
              <li><a href="/#contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 Kareerist. All rights reserved.
          </p>
          <div className="flex gap-8 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
