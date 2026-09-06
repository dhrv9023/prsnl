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
    GitBranch, History, Terminal, X, ArrowLeft, FileCode,
    FolderTree, LayoutGrid
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
    
    // Explorer view mode: 'category' (by architecture domain) vs 'directory' (by codebase repo structure)
    const [explorerMode, setExplorerMode] = useState<"category" | "directory">("category");

    // Selected Document & Content state
    const [selectedDoc, setSelectedDoc] = useState<AdminDocItem | null>(null);
    const [content, setContent] = useState<string>("");
    const [loadingContent, setLoadingContent] = useState(false);
    const [contentError, setContentError] = useState("");
    const [contentCache, setContentCache] = useState<Record<string, string>>({});
    
    // View mode: 'visual' (rendered markdown + SVGs) vs 'raw' (verbatim source)
    const [viewMode, setViewMode] = useState<"visual" | "raw">("visual");
    const [copied, setCopied] = useState(false);
    const [copiedPath, setCopiedPath] = useState(false);
    
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

    // Collapsible Directory states
    const [expandedDirectories, setExpandedDirectories] = useState<Record<string, boolean>>({
        "backend/app/api/v1/endpoints": true,
        "backend/app/services": true,
        "FRONTEND/src/pages": true,
        "supabase/migrations": true,
        "docs/architecture/flowcharts": true,
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

    // Group docs by category or directory
    const groupedDocs = useMemo(() => {
        const groups: Record<string, AdminDocItem[]> = {};
        const q = search.toLowerCase().trim();

        docs.forEach(d => {
            if (q) {
                const match = d.title.toLowerCase().includes(q) ||
                              d.path.toLowerCase().includes(q) ||
                              d.category.toLowerCase().includes(q) ||
                              d.group.toLowerCase().includes(q) ||
                              (d.code_target && d.code_target.toLowerCase().includes(q)) ||
                              (d.directory && d.directory.toLowerCase().includes(q));
                if (!match) return;
            }

            const key = explorerMode === "category" ? d.category : (d.directory || "root");

            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(d);
        });

        // In directory mode, sort directory keys logically
        if (explorerMode === "directory") {
            const sortedKeys = Object.keys(groups).sort((a, b) => {
                const getOrder = (str: string) => {
                    if (str.startsWith("backend")) return 1;
                    if (str.startsWith("FRONTEND")) return 2;
                    if (str.startsWith("supabase")) return 3;
                    if (str.startsWith("kareerist_blog")) return 4;
                    if (str.startsWith("docs/architecture")) return 5;
                    if (str.startsWith("docs/qa")) return 6;
                    if (str.startsWith("docs/history")) return 7;
                    if (str.startsWith("docs")) return 8;
                    return 9;
                };
                const diff = getOrder(a) - getOrder(b);
                if (diff !== 0) return diff;
                return a.localeCompare(b);
            });

            const sortedGroups: Record<string, AdminDocItem[]> = {};
            sortedKeys.forEach(k => {
                sortedGroups[k] = groups[k];
            });
            return sortedGroups;
        }

        return groups;
    }, [docs, search, explorerMode]);

    function toggleGroup(key: string) {
        if (explorerMode === "category") {
            setExpandedCategories(prev => ({
                ...prev,
                [key]: !prev[key]
            }));
        } else {
            setExpandedDirectories(prev => ({
                ...prev,
                [key]: !prev[key]
            }));
        }
    }

    function handleCopy() {
        if (!content) return;
        navigator.clipboard.writeText(content).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    function getGroupIcon(key: string) {
        if (explorerMode === "category") {
            switch (key) {
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
        // Directory mode icons
        if (key.startsWith("backend")) return Cpu;
        if (key.startsWith("FRONTEND")) return Code;
        if (key.startsWith("supabase")) return Database;
        if (key.includes("flowchart") || key.includes("architecture")) return Layers;
        if (key.includes("qa") || key.includes("security")) return Shield;
        if (key.includes("history")) return History;
        return Folder;
    }

    function getDocIcon(doc: AdminDocItem) {
        if (doc.is_flowchart) return Layers;
        if (doc.category.includes("Backend") || (doc.code_target && doc.code_target.startsWith("backend"))) return Cpu;
        if (doc.category.includes("Frontend") || (doc.code_target && doc.code_target.startsWith("FRONTEND"))) return Code;
        if (doc.category.includes("Database") || (doc.code_target && doc.code_target.startsWith("supabase"))) return Database;
        if (doc.category.includes("QA") || doc.category.includes("Security")) return Shield;
        if (doc.category.includes("History")) return History;
        return FileCode;
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
                    <div className="p-2.5 border-b border-border/10 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground/60 uppercase tracking-wider px-1">
                            <span>Explorer</span>
                            <span>{Object.values(groupedDocs).flat().length} items</span>
                        </div>

                        {/* View Switcher: By Category vs By Code Directory */}
                        <div className="flex items-center p-0.5 bg-secondary/30 border border-border/20 rounded-lg text-xs">
                            <button
                                onClick={() => setExplorerMode("category")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-[11px] font-medium transition-colors ${
                                    explorerMode === "category"
                                        ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                                title="Browse by Architecture Domain"
                            >
                                <LayoutGrid className="w-3 h-3" />
                                Categories
                            </button>
                            <button
                                onClick={() => setExplorerMode("directory")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-[11px] font-medium transition-colors ${
                                    explorerMode === "directory"
                                        ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                                title="Browse by Project Codebase Folder Structure"
                            >
                                <FolderTree className="w-3 h-3" />
                                Code Tree
                            </button>
                        </div>
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
                            Object.entries(groupedDocs).map(([groupKey, groupDocs]) => {
                                const Icon = getGroupIcon(groupKey);
                                const isExpanded = search
                                    ? true
                                    : explorerMode === "category"
                                        ? !!expandedCategories[groupKey]
                                        : !!expandedDirectories[groupKey];

                                return (
                                    <div key={groupKey} className="rounded-xl overflow-hidden">
                                        <button
                                            onClick={() => toggleGroup(groupKey)}
                                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-foreground/80 hover:bg-secondary/20 rounded-lg transition-colors group"
                                        >
                                            <span className="flex items-center gap-2 truncate">
                                                <Icon className="w-3.5 h-3.5 text-primary/70 group-hover:text-primary transition-colors flex-shrink-0" />
                                                <span className="truncate font-mono text-xs">{groupKey}</span>
                                            </span>
                                            <div className="flex items-center gap-1.5 text-muted-foreground/40 text-[10px] font-mono flex-shrink-0">
                                                <span>{groupDocs.length}</span>
                                                {isExpanded ? (
                                                    <ChevronDown className="w-3 h-3" />
                                                ) : (
                                                    <ChevronRight className="w-3 h-3" />
                                                )}
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="pl-3 pr-1 py-1 space-y-1 border-l border-border/15 ml-3 my-0.5">
                                                {groupDocs.map(doc => {
                                                    const isSelected = selectedDoc?.path === doc.path;
                                                    const DocIcon = getDocIcon(doc);

                                                    return (
                                                        <button
                                                            key={doc.path}
                                                            onClick={() => setSelectedDoc(doc)}
                                                            className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all flex flex-col gap-1 ${
                                                                isSelected
                                                                    ? "bg-primary/15 text-primary font-semibold border border-primary/25 shadow-sm"
                                                                    : "text-muted-foreground/70 hover:bg-secondary/20 hover:text-foreground border border-transparent"
                                                            }`}
                                                            title={`${doc.title}\n${doc.code_target ? `Code file: ${doc.code_target}` : doc.path}`}
                                                        >
                                                            <div className="flex items-center justify-between gap-2 w-full">
                                                                <span className="truncate flex items-center gap-1.5">
                                                                    <DocIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground/40"}`} />
                                                                    <span className="truncate font-medium text-foreground/90">{doc.title}</span>
                                                                </span>
                                                                {doc.code_type ? (
                                                                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-secondary/50 border border-border/30 text-muted-foreground flex-shrink-0">
                                                                        {doc.code_type.length > 15 ? doc.code_type.slice(0, 13) + "…" : doc.code_type}
                                                                    </span>
                                                                ) : doc.is_flowchart ? (
                                                                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-500/15 border border-purple-500/25 text-purple-400 flex-shrink-0">
                                                                        Flow
                                                                    </span>
                                                                ) : null}
                                                            </div>

                                                            {doc.code_target && (
                                                                <span className="text-[10px] font-mono text-muted-foreground/50 truncate flex items-center gap-1 pl-5">
                                                                    <FileCode className="w-2.5 h-2.5 text-sky-400/60 flex-shrink-0" />
                                                                    <span className="truncate">{doc.code_target}</span>
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
                                <div className="space-y-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground/60">
                                        <span>{selectedDoc.category}</span>
                                        <span>•</span>
                                        <span className="text-primary/70">{selectedDoc.group}</span>
                                        {selectedDoc.code_type && (
                                            <>
                                                <span>•</span>
                                                <span className="px-1.5 py-0.2 rounded bg-blue-500/15 border border-blue-500/30 text-blue-400 font-semibold text-[10px]">
                                                    {selectedDoc.code_type}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    <h3 className="text-base font-bold text-foreground truncate">
                                        {selectedDoc.title}
                                    </h3>
                                    {selectedDoc.code_target && (
                                        <div className="flex items-center gap-1.5 text-xs font-mono text-sky-400/90 truncate">
                                            <FileCode className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                                            <span className="text-muted-foreground/60">Code File:</span>
                                            <span className="font-semibold text-sky-300 truncate">{selectedDoc.code_target}</span>
                                        </div>
                                    )}
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
                                    <div className="max-w-4xl mx-auto space-y-6">
                                        {/* Source Code Association Card */}
                                        {selectedDoc.code_target && (
                                            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
                                                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800">
                                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                                                        <span>Source Code File Explained By This Document</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {selectedDoc.code_type && (
                                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-blue-500/20 border border-blue-500/40 text-blue-300 font-medium">
                                                                {selectedDoc.code_type}
                                                            </span>
                                                        )}
                                                        <span className="text-xs font-mono text-slate-500">
                                                            {(selectedDoc.size / 1024).toFixed(1)} KB Doc
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div className="space-y-0.5 min-w-0">
                                                        <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                                                            Target Code File
                                                        </div>
                                                        <div className="font-mono text-sm font-bold text-sky-300 truncate flex items-center gap-2">
                                                            <FileCode className="w-4 h-4 text-sky-400 flex-shrink-0" />
                                                            <span className="truncate select-all">{selectedDoc.code_target}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            if (selectedDoc.code_target) {
                                                                navigator.clipboard.writeText(selectedDoc.code_target);
                                                                setCopiedPath(true);
                                                                setTimeout(() => setCopiedPath(false), 2000);
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors border border-slate-700 shadow-sm flex-shrink-0"
                                                        title="Copy exact source file path to clipboard"
                                                    >
                                                        {copiedPath ? (
                                                            <>
                                                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                                <span className="text-emerald-400 font-semibold">Path Copied!</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                                                <span>Copy Code Path</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                                {/* Directory Breadcrumbs */}
                                                <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-1.5 text-xs font-mono text-slate-400 overflow-x-auto">
                                                    <Folder className="w-3.5 h-3.5 text-amber-400/80 flex-shrink-0" />
                                                    <span className="text-slate-500 font-medium">Directory:</span>
                                                    {(selectedDoc.directory || "root").split("/").map((segment, idx, arr) => (
                                                        <span key={idx} className="flex items-center gap-1">
                                                            <span className="text-slate-300 font-semibold hover:text-white transition-colors">{segment}</span>
                                                            {idx < arr.length - 1 && <span className="text-slate-600">/</span>}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Rendered Markdown */}
                                        <div
                                            ref={contentRef}
                                            className="doc-markdown"
                                            dangerouslySetInnerHTML={{ __html: renderedHtml }}
                                        />
                                    </div>
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
