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
              <a 
                href="https://twitter.com/kareerist5" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg bg-secondary/60 dark:bg-secondary/40 text-foreground/60 hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a 
                href="https://instagram.com/kare.erist" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg bg-secondary/60 dark:bg-secondary/40 text-foreground/60 hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a 
                href="#" 
                className="p-2.5 rounded-lg bg-secondary/60 dark:bg-secondary/40 text-foreground/60 hover:text-foreground hover:bg-secondary transition-colors opacity-50 cursor-not-allowed"
                aria-label="LinkedIn"
              >
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
              <li><Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link></li>
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
