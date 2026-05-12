import { Twitter, Linkedin } from "lucide-react";
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
              AI-powered career toolkit — resume scoring, mock interviews, cover letters, and hiring intelligence. All in one place.
            </p>
            <div className="flex space-x-3">
              <a href="#" className="p-2.5 rounded-lg bg-secondary/60 dark:bg-secondary/40 text-foreground/60 hover:text-foreground hover:bg-secondary transition-colors">
                <Twitter className="w-4 h-4" />
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
              <li><Link to="/interview" className="text-muted-foreground hover:text-foreground transition-colors">AI Mock Interview</Link></li>
              <li><Link to="/cover-letter" className="text-muted-foreground hover:text-foreground transition-colors">Cover Letter</Link></li>
              <li><Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-6">Support</h4>
            <ul className="space-y-3.5 text-sm">
              <li><a href="/#contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a></li>
              <li><a href="https://docs.google.com/forms/d/e/1FAIpQLSf0cFl_6uiYMP7iadg8EgSXz-x69usj5AcGy3kmduyl5I7mBA/viewform" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">Give Feedback</a></li>
              <li><a href="#" className="text-muted-foreground/50 cursor-not-allowed">Pricing <span className="text-[10px] ml-1 opacity-50">Soon</span></a></li>
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
