import { CalendarCheck2, HeartHandshake, TrendingUp, Video, Wallet, type LucideIcon } from "lucide-react";

/* Posts carry no category or cover image, so both are derived from the title/slug: a topic
   picks the badge, icon and gradient a post's cover is drawn with. Pure CSS — nothing to
   upload when a post is written in the marketing console. */

export type BlogTopic = "Admissions" | "Billing" | "Teaching" | "Growth" | "Operations";

interface TopicStyle {
  icon: LucideIcon;
  gradient: string;
  /** Badge text/background on a white surface. */
  chip: string;
}

export const TOPIC_STYLES: Record<BlogTopic, TopicStyle> = {
  Admissions: { icon: HeartHandshake, gradient: "linear-gradient(135deg, #F97316 0%, #F53BA6 100%)", chip: "bg-[#FFF3EA] text-[#C2410C]" },
  Billing: { icon: Wallet, gradient: "linear-gradient(135deg, #F53BA6 0%, #7C5CFC 100%)", chip: "bg-[#FDECF6] text-[#BE185D]" },
  Teaching: { icon: Video, gradient: "linear-gradient(135deg, #7C5CFC 0%, #3B82F6 100%)", chip: "bg-[#F1EDFF] text-[#5B3FD9]" },
  Growth: { icon: TrendingUp, gradient: "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)", chip: "bg-[#FEF5E7] text-[#B45309]" },
  Operations: { icon: CalendarCheck2, gradient: "linear-gradient(135deg, #0D1024 0%, #3B2A7A 60%, #F97316 140%)", chip: "bg-[#EEF0F6] text-[#262D37]" },
};

export const TOPIC_ORDER: BlogTopic[] = ["Admissions", "Billing", "Teaching", "Growth", "Operations"];

// First match wins, so the more specific topics come first.
const TOPIC_RULES: [BlogTopic, RegExp][] = [
  ["Billing", /fee|payment|gateway|pric|billing|cost/],
  ["Admissions", /demo|admission|enrol|booking|crm|lead/],
  ["Teaching", /class|whiteboard|gamif|recording|teacher|zoom|lesson/],
  ["Growth", /grow|tutor|branch|playbook|families-leave|master|counsel|school|creator/],
];

export function topicOf(post: { slug: string; title: string }): BlogTopic {
  const haystack = `${post.slug} ${post.title}`.toLowerCase();
  return TOPIC_RULES.find(([, re]) => re.test(haystack))?.[0] ?? "Operations";
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}
