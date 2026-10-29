# SEO tracking with OpenSEO

[OpenSEO](https://github.com/every-app/open-seo) (MIT) is a self-hosted alternative to Semrush/Ahrefs: keyword research, rank tracking, site audits, backlinks and AI visibility. It runs **separately** from this app. Nothing in this repo depends on it.

## Setup

1. Create a [DataForSEO](https://dataforseo.com) account and API key. Self-hosters pay DataForSEO directly.
2. Deploy OpenSEO, either way:
   - **Docker:** use the prebuilt image or `docker compose` from the OpenSEO README (works with Coolify, Portainer, Dokploy).
   - **Cloudflare:** run its one-command Wrangler deploy to our own account.
3. Set the DataForSEO credentials in OpenSEO's environment, as its README describes. Keep them out of this repo.

## What to track for meettomanage.cloud

- **Site audit:** `https://meettomanage.cloud`. Pages come from `public/sitemap.xml`: `/`, `/pricing`, `/get-started`, `/store`, `/demo`, `/blog` and the blog posts.
- **Keywords (starting set):** online coaching centre software, academy management software, coaching institute fee management, parent app for tutoring centre, online classroom for academies.
- **Competitors:** add the main coaching or academy management SaaS rivals.
- **Markets:** track English and Arabic (the marketing site is bilingual).

## Keeping the sitemap in sync

When adding marketing or blog routes, update `public/sitemap.xml` so the OpenSEO audit and search engines see them. `public/robots.txt` already points to it.

## Optional: MCP for Claude Code

OpenSEO ships an MCP server and Agent Skills. To use them from Claude Code, add the server per the OpenSEO README (`claude mcp add ...`) pointing at our deployed instance.
