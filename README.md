# Kareerist Studio — Frontend

A modern career toolkit built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS**.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

The app will be running at **http://localhost:8080**

### Or use the batch script (Windows)

Double-click **`start.bat`** — it auto-installs deps if needed and starts the server.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 8080) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Project Structure

```
FRONTEND/
├── public/              # Static assets
├── src/
│   ├── components/
│   │   ├── layout/      # Navbar, Footer
│   │   ├── sections/    # Homepage sections (Hero, Features, etc.)
│   │   └── ui/          # Reusable UI primitives (shadcn/ui)
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities
│   ├── pages/           # Route pages
│   ├── App.tsx          # Root component & routing
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tailwind.config.ts   # Tailwind CSS configuration
├── package.json
└── start.bat            # Quick-start script (Windows)
```

## Tech Stack

- **React 18** + TypeScript
- **Vite 5** — fast dev server & bundler
- **Tailwind CSS 3** — utility-first styling
- **Framer Motion** — animations
- **React Router 6** — client-side routing
- **shadcn/ui** — accessible UI components
- **Lucide React** — icons
