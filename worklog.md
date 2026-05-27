---
Task ID: 1
Agent: Main Agent
Task: Migrate Horivoo from static HTML/CSS/JS to Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui + Supabase SSR

Work Log:
- Analyzed reference app (Gente da Feira Chat) to understand the target architecture
- Read all source files from the current Horivoo static app (index.html, js/*.js, css/style.css, sql/schema.sql)
- Read all reference app files (package.json, layout.tsx, AuthForm.tsx, AppShell.tsx, supabase client/server, store.ts, etc.)
- Initialized Next.js 16 project with fullstack-dev skill
- Installed @supabase/ssr and @supabase/supabase-js
- Delegated full migration to full-stack-developer subagent
- Verified all 30+ files were created successfully
- Ran lint: 0 errors
- Copied SQL schema and icons from original project
- Generated ZIP deliverable at /home/z/my-project/download/horivoo-nextjs.zip

Stage Summary:
- Complete migration from static HTML/CSS/JS to Next.js 16 + TypeScript + Tailwind 4
- Architecture matches GDF Chat pattern (Supabase SSR, Zustand, API routes, shadcn/ui)
- All 3 roles preserved: Teacher (auth), Student (guest), Coordinator (auth)
- Custom time slots (07:35, 19:45) working via buildMergedSchedule
- PWA support with service worker
- Horivoo color theme (green/terracota/purple/beige) mapped to Tailwind CSS variables
- Lint: 0 errors, app running on dev server
