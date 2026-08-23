import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          border: "hsl(var(--sidebar-border))",
        },
        brand: {
          navy: "#161B33",
          navyDark: "#0D1024",
          green: "#57B33B",
          // Darkened from #3C8A27 — that value still only cleared 4.32:1 against white
          // (below WCAG AA's 4.5:1), the shade this token exists for readable green
          // text/links on light backgrounds (badges, "Forgot your PIN?" / "Explore More").
          greenDark: "#3C7A29",
          cyan: "#17A9C9",
          blue: "#5B93E0",
          pink: "#F53BA6",
          violet: "#7C5CFC",
          amber: "#F5A524",
          cream: "#FFF8EF",
          ink: "#3A2A18",
        },
        role: {
          admin: "#1F6FE0",
          subadmin: "#0E9C8C",
          admission: "#8356E7", // kept in sync with ROLE_META.admission.hex in src/lib/roles.ts
          teacher: "#F08A1D",
          parent: "#23A455",
          student: "#3B82F6",
          // Was #0D9488 — nearly indistinguishable from subadmin's #0E9C8C (the two read
          // as the same teal side-by-side on PortalSelect/marketing's all-8-roles grid) and
          // literally identical to CHART_PALETTE's own teal, double-booking one hex for two
          // unrelated meanings. Moved into the one genuinely open hue gap left in the whole
          // palette (nothing else in brand/role/status/chart sits between teacher's orange
          // and parent's green) — a goldenrod distinct from every other role, brand, and
          // status color. Navy clears 5.2:1 against it (picked automatically by
          // pickAccentForegroundHsl), same mechanism as every other role but admission.
          coordinator: "#B8860B",
          // Was #7C3AED — one of five near-identical purples/violets in the system (with
          // admission's role color, brand.violet, CHART_PALETTE's violet and status.demo),
          // and the one most exposed by it: management sits beside admission in the same
          // all-8-roles grid (PortalSelect, marketing Home) where the two read as the same
          // hue. Shifted into the empty ~40° gap between the blue cluster (admin/student)
          // and the purple cluster (admission) — a distinct indigo, not "another purple."
          management: "#4F46E5",
        },
        status: {
          scheduled: "#EAB308",
          completed: "#22C55E",
          // Was #EF4444 (Tailwind red-500) — a second, lighter red alongside --destructive's
          // #C52020, both meaning "cancelled/danger" and both visible in the same screen
          // (Sessions.tsx's cancelled-status dot next to its destructive-styled Cancel
          // button/dialog). Unified to the same red so "danger" has one consistent shade.
          cancelled: "#C52020",
          noshow: "#3B82F6",
          // Was #A855F7 — sat inside the same 20°-wide purple band as admission's role color
          // (#8356E7, which --primary is repointed to app-wide on the Admission portal), so
          // every row of DemoScheduling.tsx — where every session IS a demo — showed two
          // slightly-off purples together. Shifted into fuchsia, clearly its own hue rather
          // than a near-miss of the portal's own brand purple. Only ever rendered as a small
          // status dot (see StatusBadge.tsx) — no paired foreground text to re-check.
          demo: "#D946EF",
          rescheduled: "#F97316",
          holiday: "#94A3B8",
          leave: "#EC4899",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 10px)",
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        card: "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 8px 24px -8px rgb(15 23 42 / 0.10)",
        pop: "0 12px 32px -8px rgb(15 23 42 / 0.22)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "pop-in": { "0%": { opacity: "0", transform: "scale(0.9)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        confetti: {
          "0%": { transform: "translateY(0) translateX(0) rotate(0)", opacity: "1" },
          "55%": { transform: "translateY(160px) translateX(var(--drift, 24px)) rotate(200deg)", opacity: "1" },
          "100%": { transform: "translateY(340px) translateX(0) rotate(420deg)", opacity: "0" },
        },
        // Sparks fired outward from the celebration card on entry — the radial layer
        // that makes the moment read as a "burst" rather than confetti falling alone.
        "spark-burst": {
          "0%": { transform: "translate(-50%, -50%) scale(0.4)", opacity: "1" },
          "100%": { transform: "translate(calc(-50% + var(--tx, 80px)), calc(-50% + var(--ty, -80px))) scale(1)", opacity: "0" },
        },
        // A punchier badge entrance than a plain fade — overshoots past full size and
        // rotation before settling, the classic "pop" a sticker or medal gets on award.
        "badge-pop": {
          "0%": { transform: "scale(0.4) rotate(-25deg)", opacity: "0" },
          "55%": { transform: "scale(1.2) rotate(10deg)", opacity: "1" },
          "80%": { transform: "scale(0.95) rotate(-4deg)" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        "page-in": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        shimmer: { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(100%)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.25s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "pop-in": "pop-in 0.2s cubic-bezier(0.16,1,0.3,1)",
        confetti: "confetti 1.9s ease-in forwards",
        "spark-burst": "spark-burst 0.7s cubic-bezier(0.16,1,0.3,1) forwards",
        "badge-pop": "badge-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "page-in": "page-in 0.28s cubic-bezier(0.16,1,0.3,1)",
        shimmer: "shimmer 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
