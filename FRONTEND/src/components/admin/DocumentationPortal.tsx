import { useEffect, useState, useRef, useMemo } from "react";
import {
    apiGetAdminDocsCatalog,
    apiGetAdminDocContent,
    type AdminDocItem
} from "@/lib/api";
import {
    BookOpen, Search, FileText, ChevronRight, ChevronDown,
    Copy, Check, ExternalLink, RefreshCw, Loader2,
    Code, Eye, Folder, Layers, Shield, Cpu, Database,
    GitBranch, History, Terminal, X, ArrowLeft
} from "lucide-react";
import { marked } from "marked";
import mermaid from "mermaid";

// Configure marked with GFM options
marked.setOptions({
    gfm: true,
    breaks: false,
});

export function DocumentationPortal() {
    const [docs, setDocs] = useState<AdminDocItem[]>([]);
    const [loadingCatalog, setLoadingCatalog] = useState(true);
    const [catalogError, setCatalogError] = useState("");
    const [search, setSearch] = useState("");
    
    // Selected Document & Content state
    const [selectedDoc, setSelectedDoc] = useState<AdminDocItem | null>(null);
    const [content, setContent] = useState<string>("");
    const [loadingContent, setLoadingContent] = useState(false);
    const [contentError, setContentError] = useState("");
    const [contentCache, setContentCache] = useState<Record<string, string>>({});
    
    // View mode: 'visual' (rendered markdown + SVGs) vs 'raw' (verbatim source)
    const [viewMode, setViewMode] = useState<"visual" | "raw">("visual");
    const [copied, setCopied] = useState(false);
    
    // Collapsible Category states
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
        "Architecture & Flowcharts": true,
        "Backend Architecture": true,
        "Frontend Architecture": true,
        "Database & Migrations": false,
        "QA Audits & Pentest": true,
        "Project History": false,
        "Security Specifications": false,
        "Master Specifications": false,
    });

    const contentRef = useRef<HTMLDivElement>(null);

    // Initialize Mermaid once
    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: "dark",
            securityLevel: "loose",
            fontFamily: "Inter, system-ui, sans-serif",
            flowchart: {
                nodeSpacing: 75,
                rankSpacing: 95,
                padding: 22,
                curve: "basis",
                useMaxWidth: false,
            },
            themeVariables: {
                darkMode: true,
                fontSize: "14px",
                background: "transparent",
                primaryColor: "#1e293b",
                primaryTextColor: "#f8fafc",
                primaryBorderColor: "#475569",
                lineColor: "#60a5fa",
                secondaryColor: "#0f172a",
                tertiaryColor: "#1e1b4b",
                edgeLabelBackground: "#0b1329",
                clusterBkg: "#0b1329",
                clusterBorder: "#334155",
            },
        });
    }, []);

    // Fetch documentation catalog on mount
    useEffect(() => {
        async function loadCatalog() {
            setLoadingCatalog(true);
            setCatalogError("");
            try {
                const res = await apiGetAdminDocsCatalog();
                setDocs(res.docs);
                // Default to first flowchart or first doc if available
                if (res.docs.length > 0) {
                    const defaultDoc = res.docs.find(d => d.path.includes("diagram_01_system_overview")) || res.docs[0];
                    setSelectedDoc(defaultDoc);
                }
            } catch (err: unknown) {
                setCatalogError((err as Error).message || "Failed to load documentation catalog.");
            } finally {
                setLoadingCatalog(false);
            }
        }
        loadCatalog();
    }, []);

    // Load content when selectedDoc changes (with cache)
    useEffect(() => {
        if (!selectedDoc) return;
        const path = selectedDoc.path;

        if (contentCache[path]) {
            setContent(contentCache[path]);
            return;
        }

        async function fetchDoc() {
            setLoadingContent(true);
            setContentError("");
            try {
                const res = await apiGetAdminDocContent(path);
                setContent(res.content);
                setContentCache(prev => ({ ...prev, [path]: res.content }));
            } catch (err: unknown) {
                setContentError((err as Error).message || "Failed to load document content.");
            } finally {
                setLoadingContent(false);
            }
        }
        fetchDoc();
    }, [selectedDoc]);

    // Parse Markdown to HTML
    const renderedHtml = useMemo(() => {
        if (!content || viewMode !== "visual") return "";
        try {
            return marked.parse(content) as string;
        } catch (e) {
            console.error("Markdown parse error:", e);
            return `<pre class="p-4 text-red-400 bg-red-950/20 border border-red-900 rounded-lg">Error rendering markdown</pre>`;
        }
    }, [content, viewMode]);

    // Post-process HTML to render Mermaid code blocks into SVG
    useEffect(() => {
        if (viewMode !== "visual" || !contentRef.current || !renderedHtml) return;

        const mermaidBlocks = contentRef.current.querySelectorAll("pre code.language-mermaid");
        if (mermaidBlocks.length === 0) return;

        let active = true;

        mermaidBlocks.forEach(async (block, index) => {
            const rawCode = block.textContent || "";
            const parentPre = block.parentElement;
            if (!parentPre) return;

            const uniqueId = `mermaid-admin-${index}-${Math.floor(Math.random() * 100000)}`;

            try {
                const { svg } = await mermaid.render(uniqueId, rawCode);
                if (!active) return;

                const wrapper = document.createElement("div");
                wrapper.className = "my-8 p-6 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-x-auto flex flex-col items-center";
                
                const header = document.createElement("div");
                header.className = "w-full flex items-center justify-between pb-3 mb-4 border-b border-slate-800/60 text-xs font-mono text-slate-400";
                header.innerHTML = `
                    <span class="flex items-center gap-1.5 text-blue-400 font-semibold">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M14 14h7v7h-7z"/><path d="M3 14h7v7H3z"/></svg>
                        Interactive System Flowchart
                    </span>
                    <span class="text-slate-500">Rendered via Mermaid Engine</span>
                `;

                const svgContainer = document.createElement("div");
                svgContainer.className = "w-full flex justify-center min-w-max";
                svgContainer.innerHTML = svg;

                wrapper.appendChild(header);
                wrapper.appendChild(svgContainer);

                parentPre.replaceWith(wrapper);
            } catch (err) {
                console.warn("Mermaid block render fallback to raw code:", err);
            }
        });

        return () => {
            active = false;
        };
    }, [renderedHtml, viewMode]);

    // Group docs by category
    const groupedDocs = useMemo(() => {
        const groups: Record<string, AdminDocItem[]> = {};
        const q = search.toLowerCase().trim();

        docs.forEach(d => {
            if (q) {
                const match = d.title.toLowerCase().includes(q) ||
                              d.path.toLowerCase().includes(q) ||
                              d.category.toLowerCase().includes(q) ||
                              d.group.toLowerCase().includes(q);
                if (!match) return;
            }

            if (!groups[d.category]) {
                groups[d.category] = [];
            }
            groups[d.category].push(d);
        });

        return groups;
    }, [docs, search]);

    function toggleCategory(cat: string) {
        setExpandedCategories(prev => ({
            ...prev,
            [cat]: !prev[cat]
        }));
    }

    function handleCopy() {
        if (!content) return;
        navigator.clipboard.writeText(content).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    function getCategoryIcon(cat: string) {
        switch (cat) {
            case "Architecture & Flowcharts":
                return Layers;
            case "Backend Architecture":
                return Cpu;
            case "Frontend Architecture":
                return Code;
            case "Database & Migrations":
                return Database;
            case "QA Audits & Pentest":
                return Shield;
            case "Project History":
                return History;
            case "Security Specifications":
                return Shield;
            default:
                return BookOpen;
        }
    }

    return (
        <div className="rounded-2xl border border-border/30 bg-card/40 backdrop-blur-md overflow-hidden shadow-2xl flex flex-col h-[820px]">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-border/20 bg-secondary/10">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400">
                        <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                            Project Documentation Portal
                            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                {docs.length} Documents
                            </span>
                        </h2>
                        <p className="text-xs text-muted-foreground/60">
                            Verbatim architecture, security audits, and engineering specifications. Admin access only.
                        </p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative w-72">
                    <Search className="w-3.5 h-3.5 text-muted-foreground/50 absolute left-3 top-2.5" />
                    <input
                        type="text"
                        placeholder="Search all documentation..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-8 pl-8 pr-8 rounded-lg bg-secondary/20 border border-border/30 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Layout (Sidebar + Reader) */}
            <div className="flex-1 flex overflow-hidden">
                {/* ── Left Sidebar (Tree / Explorer) ────────────────────────────── */}
                <aside className="w-80 border-r border-border/20 bg-secondary/5 flex flex-col h-full flex-shrink-0">
                    <div className="p-3 border-b border-border/10 flex items-center justify-between text-[11px] font-mono text-muted-foreground/60 uppercase tracking-wider">
                        <span>Explorer</span>
                        <span>{Object.values(groupedDocs).flat().length} items</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
                        {loadingCatalog ? (
                            <div className="p-8 text-center space-y-2">
                                <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                                <p className="text-xs text-muted-foreground/60 font-mono">Indexing documents...</p>
                            </div>
                        ) : catalogError ? (
                            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                                {catalogError}
                            </div>
                        ) : Object.keys(groupedDocs).length === 0 ? (
                            <div className="p-8 text-center text-xs text-muted-foreground/50">
                                No documentation matching "{search}"
                            </div>
                        ) : (
                            Object.entries(groupedDocs).map(([category, catDocs]) => {
                                const Icon = getCategoryIcon(category);
                                const isExpanded = search ? true : !!expandedCategories[category];

                                return (
                                    <div key={category} className="rounded-xl overflow-hidden">
                                        <button
                                            onClick={() => toggleCategory(category)}
                                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-foreground/80 hover:bg-secondary/20 rounded-lg transition-colors group"
                                        >
                                            <span className="flex items-center gap-2 truncate">
                                                <Icon className="w-3.5 h-3.5 text-primary/70 group-hover:text-primary transition-colors flex-shrink-0" />
                                                <span className="truncate">{category}</span>
                                            </span>
                                            <div className="flex items-center gap-1.5 text-muted-foreground/40 text-[10px] font-mono flex-shrink-0">
                                                <span>{catDocs.length}</span>
                                                {isExpanded ? (
                                                    <ChevronDown className="w-3 h-3" />
                                                ) : (
                                                    <ChevronRight className="w-3 h-3" />
                                                )}
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="pl-3 pr-1 py-1 space-y-0.5 border-l border-border/15 ml-3 my-0.5">
                                                {catDocs.map(doc => {
                                                    const isSelected = selectedDoc?.path === doc.path;
                                                    return (
                                                        <button
                                                            key={doc.path}
                                                            onClick={() => setSelectedDoc(doc)}
                                                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center justify-between gap-2 ${
                                                                isSelected
                                                                    ? "bg-primary/15 text-primary font-semibold border border-primary/25 shadow-sm"
                                                                    : "text-muted-foreground/70 hover:bg-secondary/20 hover:text-foreground border border-transparent"
                                                            }`}
                                                            title={doc.path}
                                                        >
                                                            <span className="truncate flex items-center gap-1.5">
                                                                <FileText className={`w-3 h-3 flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground/40"}`} />
                                                                <span className="truncate">{doc.title}</span>
                                                            </span>
                                                            {doc.is_flowchart && (
                                                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-500/15 border border-purple-500/25 text-purple-400 flex-shrink-0">
                                                                    Flow
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </aside>

                {/* ── Right Main Area (Document Viewer) ────────────────────────── */}
                <main className="flex-1 flex flex-col h-full bg-background/50 overflow-hidden">
                    {selectedDoc ? (
                        <>
                            {/* Document Header Bar */}
                            <div className="px-6 py-3.5 border-b border-border/20 bg-card/60 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
                                <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground/60">
                                        <span>{selectedDoc.category}</span>
                                        <span>•</span>
                                        <span className="text-primary/70">{selectedDoc.group}</span>
                                    </div>
                                    <h3 className="text-base font-bold text-foreground truncate">
                                        {selectedDoc.title}
                                    </h3>
                                    <p className="text-[11px] font-mono text-muted-foreground/50 truncate">
                                        {selectedDoc.path} · {(selectedDoc.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>

                                {/* Controls: Visual/Raw Mode, Copy */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {/* Mode Toggle */}
                                    <div className="flex items-center p-0.5 bg-secondary/30 border border-border/30 rounded-lg">
                                        <button
                                            onClick={() => setViewMode("visual")}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                                viewMode === "visual"
                                                    ? "bg-primary text-primary-foreground shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground"
                                            }`}
                                        >
                                            <Eye className="w-3 h-3" />
                                            Visual
                                        </button>
                                        <button
                                            onClick={() => setViewMode("raw")}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                                viewMode === "raw"
                                                    ? "bg-primary text-primary-foreground shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground"
                                            }`}
                                        >
                                            <Code className="w-3 h-3" />
                                            Raw
                                        </button>
                                    </div>

                                    {/* Copy Button */}
                                    <button
                                        onClick={handleCopy}
                                        disabled={!content}
                                        className="h-8 px-3 rounded-lg border border-border/30 bg-secondary/20 hover:bg-secondary/40 text-xs font-medium text-foreground/80 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                        title="Copy full document text to clipboard"
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                <span className="text-emerald-400">Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                                <span>Copy Markdown</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Document Body */}
                            <div className="flex-1 overflow-y-auto p-8 md:p-12 relative bg-slate-950/30">
                                {loadingContent ? (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="text-center space-y-2">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                                            <p className="text-xs text-muted-foreground font-mono">Loading full document...</p>
                                        </div>
                                    </div>
                                ) : contentError ? (
                                    <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                                        <p className="font-bold">Error loading document</p>
                                        <p className="text-xs opacity-80 mt-1">{contentError}</p>
                                    </div>
                                ) : viewMode === "raw" ? (
                                    <div className="rounded-xl border border-border/30 bg-slate-950 p-6 overflow-x-auto shadow-inner">
                                        <pre className="font-mono text-xs text-blue-200 leading-relaxed whitespace-pre select-all">
                                            {content}
                                        </pre>
                                    </div>
                                ) : (
                                    <div
                                        ref={contentRef}
                                        className="max-w-4xl mx-auto doc-markdown"
                                        dangerouslySetInnerHTML={{ __html: renderedHtml }}
                                    />
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex items-center justify-center p-8 text-center text-muted-foreground/40 space-y-2">
                            <div>
                                <BookOpen className="w-10 h-10 mx-auto stroke-1 text-muted-foreground/30 mb-2" />
                                <p className="text-sm font-medium">Select a document from the explorer to read.</p>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
