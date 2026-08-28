import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Seo } from "@/components/Seo";
import { useLightBrandScope } from "@/lib/theme";
import { BLOG_POSTS } from "@/data/blogPosts";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function BlogList() {
  useLightBrandScope();
  const posts = [...BLOG_POSTS].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="theme-light-scope min-h-screen bg-white text-[#171B22]">
      <Seo
        title="Blog — Meet to Manage"
        description="Practical notes on running a modern academy: admissions, billing automation, scheduling and more."
        path="/blog"
      />

      <header className="sticky top-0 z-30 border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" aria-label="Meet to Manage home">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" /> Back home
              </Link>
            </Button>
            <Button asChild className="!bg-[#F97316] !text-white hover:!bg-[#EA580C]">
              <Link to="/login">
                Sign In <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-14">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#EA580C]">Blog</p>
        <h1 className="font-display mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Notes on running a modern academy
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-[#5B6472]">
          Practical thinking on admissions, billing, scheduling and the everyday friction of running classes at
          scale.
        </p>

        <div className="mt-12 divide-y divide-black/10 border-t border-black/10">
          {posts.map((post) => (
            <Link key={post.slug} to={`/blog/${post.slug}`} className="group block py-8">
              <p className="text-xs font-medium text-[#5B6472]">
                {formatDate(post.date)} · {post.readMinutes} min read
              </p>
              <h2 className="font-display mt-2 text-xl font-bold tracking-tight text-[#171B22] group-hover:text-[#EA580C] sm:text-2xl">
                {post.title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#5B6472]">{post.excerpt}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#EA580C]">
                Read more <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-black/10 bg-[#F5F6F9] py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row sm:text-left">
          <Logo imgClassName="h-7 w-7" />
          <p className="text-xs font-medium text-[#5B6472]">© {new Date().getFullYear()} Meet to Manage. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
