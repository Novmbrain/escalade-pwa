# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm run dev      # Start development server with Turbopack
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

**Note:** Requires Node.js >= 20.9.0 (Next.js 16 requirement). Vercel deployment handles this automatically.

## Adding shadcn/ui Components

```bash
npx shadcn@latest add <component-name>
```

Components are installed to `src/components/ui/`. Available components: https://ui.shadcn.com/docs/components

## Architecture

- **Framework:** Next.js 16 with App Router (`src/app/`)
- **Styling:** Tailwind CSS v4 with shadcn/ui (new-york style, neutral base color)
- **PWA:** Serwist (modern next-pwa alternative) with service worker at `src/app/sw.ts`
- **UI Components:** shadcn/ui components in `src/components/ui/`, utility functions in `src/lib/utils.ts`

### Key Files

- `src/app/sw.ts` - Service worker configuration for PWA caching
- `public/manifest.json` - PWA manifest (app name, icons, display mode)
- `next.config.ts` - Next.js config with Serwist PWA wrapper
- `components.json` - shadcn/ui configuration

### Import Aliases

- `@/components` - React components
- `@/components/ui` - shadcn/ui components
- `@/lib` - Utility functions
- `@/hooks` - Custom React hooks
