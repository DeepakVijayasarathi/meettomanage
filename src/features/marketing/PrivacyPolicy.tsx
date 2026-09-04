import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Seo } from "@/components/Seo";
import { useLightBrandScope } from "@/lib/theme";

/**
 * Legal text, supplied verbatim by the business (not editorial copy this codebase authors,
 * unlike blog posts) — kept as one literal block rather than run through any markdown
 * parser, so nothing here is ever unintentionally reflowed or reworded. Covers both
 * meettomanage.cloud and Infinity Client Finder (the Meta/Instagram-integrated lead-discovery
 * tool also operated by Infinity Uniquers) since Meta's app review requires a single public
 * policy URL for that integration — this page is served at that exact URL.
 */
type Block =
  | { h3: string }
  | { p: string }
  | { ul: string[] };

/** Section renderer shared by both halves below and the two hardcoded sections (8 and 15)
 *  that need inline mailto/https links rather than plain bullet text — split in two so
 *  those two can be inserted at their correct numeric position instead of appearing out
 *  of order after the rest of the list. */
function Section({ h2, blocks }: { h2: string; blocks: Block[] }) {
  return (
    <section>
      <h2 className="font-display mt-8 text-xl font-bold tracking-tight text-[#171B22] first:mt-0">{h2}</h2>
      <div className="mt-3 flex flex-col gap-3">
        {blocks.map((block, i) =>
          "h3" in block ? (
            <h3 key={i} className="mt-2 text-base font-bold text-[#171B22]">
              {block.h3}
            </h3>
          ) : "ul" in block ? (
            <ul key={i} className="flex flex-col gap-1.5 ps-1">
              {block.ul.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-base leading-relaxed text-[#5B6472]">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F97316]" />
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p key={i} className="text-base leading-relaxed text-[#5B6472]">
              {block.p}
            </p>
          )
        )}
      </div>
    </section>
  );
}

// Split 1–7 / 9–14 so the two hand-written sections below (8: Data Deletion, 15: Contact
// Us — both have inline mailto/https links rather than plain bullet text) render at their
// correct numeric position instead of after everything else.
const SECTIONS_1_TO_7: { h2: string; blocks: Block[] }[] = [
  {
    h2: "1. Information We Collect",
    blocks: [
      { p: "We may collect the following types of information:" },
      { h3: "Account Information" },
      { ul: ["Name", "Email address", "Phone number, where provided", "Login and account information", "Business or company information"] },
      { h3: "Business and Lead Information" },
      { p: "When you use our lead-management and business intelligence features, the application may process:" },
      {
        ul: [
          "Company name",
          "Business website",
          "Business contact information",
          "Professional role or designation",
          "Publicly available business information",
          "Lead requirements and business interests",
          "Notes and information entered by users",
        ],
      },
      { h3: "Social Media Information" },
      {
        p: "If you voluntarily connect a supported social media account, such as Instagram or Facebook, we may receive information that the applicable platform makes available to our application based on the permissions you grant.",
      },
      { p: "This may include, depending on the platform and permissions:" },
      {
        ul: [
          "Account or profile information",
          "Business or professional account information",
          "Posts, comments, or other content made available through the authorized integration",
          "Messages or communication data where the applicable permission and functionality allow access",
          "Information required to operate the integration",
        ],
      },
      { p: "We only request and use permissions that are necessary for the functionality of the application." },
      { h3: "Technical Information" },
      { p: "We may automatically collect limited technical information, including:" },
      { ul: ["IP address", "Browser type", "Device type", "Operating system", "Application usage information", "Log and security information"] },
    ],
  },
  {
    h2: "2. How We Use Information",
    blocks: [
      { p: "We may use information to:" },
      {
        ul: [
          "Create and manage user accounts",
          "Provide our application and services",
          "Connect authorized social media accounts",
          "Identify and organize business leads",
          "Analyze business and publicly available information",
          "Provide lead discovery and sales intelligence features",
          "Help users manage potential customers",
          "Generate lead scores or business insights",
          "Improve application functionality",
          "Monitor and maintain application security",
          "Provide customer support",
          "Prevent fraud, abuse, or unauthorized access",
          "Comply with applicable laws and legal requirements",
        ],
      },
    ],
  },
  {
    h2: "3. Social Media Platform Data",
    blocks: [
      { p: "Infinity Client Finder may integrate with third-party platforms, including Meta services such as Instagram and Facebook." },
      {
        p: "When you connect a social media account, we access only the information made available through the applicable platform and the permissions authorized for our application.",
      },
      { p: "We use such information only for the purposes described in this Privacy Policy and to provide the functionality requested by the user." },
      { p: "We do not sell, rent, or trade social media information." },
      { p: "We do not use social media information for purposes unrelated to the functionality of our application." },
      { p: "Our use of information received from Meta APIs will comply with applicable Meta Platform Terms, Developer Policies, and other applicable requirements." },
    ],
  },
  {
    h2: "4. Publicly Available Information",
    blocks: [
      { p: "Our application may process publicly available business or professional information for legitimate business and lead-management purposes." },
      {
        p: "Public information may include information published by businesses or professionals on websites, business directories, social platforms, or other publicly accessible sources.",
      },
      {
        p: "We do not represent that publicly available information is always accurate or complete. Users are responsible for verifying information before using it for business communication or decision-making.",
      },
    ],
  },
  {
    h2: "5. Data Sharing",
    blocks: [
      { p: "We do not sell or rent personal information." },
      { p: "We may share information with trusted service providers that help us operate the application, including:" },
      { ul: ["Cloud hosting providers", "Database and infrastructure providers", "Security providers", "Analytics and monitoring providers", "Communication and support providers"] },
      { p: "These service providers are permitted to process information only as necessary to provide services to us." },
      { p: "We may also disclose information when:" },
      {
        ul: [
          "Required by law",
          "Required by a valid legal process",
          "Necessary to protect our rights or property",
          "Necessary to prevent fraud, abuse, or security threats",
          "Necessary to protect the safety of users or the public",
        ],
      },
    ],
  },
  {
    h2: "6. Data Storage and Security",
    blocks: [
      { p: "We use reasonable technical and organizational security measures to protect information from unauthorized access, alteration, disclosure, or destruction." },
      { p: "Data may be stored on secure cloud infrastructure operated by third-party service providers." },
      { p: "Although we take reasonable precautions, no internet-based service can guarantee complete security." },
    ],
  },
  {
    h2: "7. Data Retention",
    blocks: [
      { p: "We retain information only for as long as reasonably necessary to:" },
      { ul: ["Provide our services", "Maintain user accounts", "Provide requested functionality", "Maintain business records", "Resolve disputes", "Prevent fraud or abuse", "Comply with legal obligations"] },
      { p: "When information is no longer required, we may delete or anonymize it in accordance with our data-retention practices and applicable law." },
    ],
  },
];

const SECTIONS_9_TO_14: { h2: string; blocks: Block[] }[] = [
  {
    h2: "9. Third-Party Services",
    blocks: [
      { p: "Our application may contain integrations with third-party services and platforms." },
      { p: "Third-party services operate independently and may have their own privacy policies and terms." },
      { p: "We encourage users to review the privacy policies and terms of any third-party service they connect to our application." },
    ],
  },
  {
    h2: "10. Cookies and Similar Technologies",
    blocks: [
      { p: "Our website and application may use cookies or similar technologies for purposes such as:" },
      { ul: ["Authentication", "Maintaining user sessions", "Security", "Remembering preferences", "Improving application performance", "Understanding application usage"] },
      { p: "Users may be able to control cookies through their browser settings. Disabling certain cookies may affect application functionality." },
    ],
  },
  {
    h2: "11. User Responsibilities",
    blocks: [
      { p: "Users are responsible for ensuring that information they provide to the application is accurate and that they have the appropriate rights or authorization to use information they upload or connect." },
      { p: "Users must not use the application to:" },
      {
        ul: [
          "Violate applicable laws",
          "Harass or abuse individuals",
          "Send unlawful or unauthorized communications",
          "Circumvent platform restrictions",
          "Access information they are not authorized to access",
          "Misuse third-party platform data",
        ],
      },
    ],
  },
  {
    h2: "12. Children's Privacy",
    blocks: [
      { p: "Our services are intended for businesses and general users and are not directed toward children." },
      { p: "We do not knowingly collect personal information from children where such collection is prohibited by applicable law." },
      { p: "If you believe a child has provided personal information to us, please contact us at the email address below." },
    ],
  },
  {
    h2: "13. International Data Processing",
    blocks: [
      { p: "Depending on the infrastructure and service providers we use, information may be processed or stored in countries other than the country where you reside." },
      { p: "We take reasonable steps to ensure that information is handled in accordance with applicable privacy and data-protection requirements." },
    ],
  },
  {
    h2: "14. Changes to This Privacy Policy",
    blocks: [
      { p: "We may update this Privacy Policy from time to time to reflect changes in our services, technology, legal requirements, or business practices." },
      { p: "When we make changes, we will update the Last Updated date at the top of this page." },
      { p: "We encourage users to periodically review this Privacy Policy." },
    ],
  },
];

export default function PrivacyPolicy() {
  useLightBrandScope();

  return (
    <div className="theme-light-scope min-h-screen bg-white text-[#171B22]">
      <Seo
        title="Privacy Policy — Meet to Manage"
        description="How Infinity Uniquers collects, uses, stores, shares and protects information across Meet to Manage and Infinity Client Finder."
        path="/policy"
      />

      <header className="sticky top-0 z-30 border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" aria-label="Meet to Manage home">
            <Logo />
          </Link>
          <Button asChild variant="ghost">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> Back home
            </Link>
          </Button>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Privacy Policy</h1>
        <p className="mt-3 text-sm font-semibold text-[#5B6472]">Last Updated: September 4, 2026</p>

        <div className="mt-8 flex flex-col gap-4 text-base leading-relaxed text-[#5B6472]">
          <p>
            Infinity Uniquers (&#8220;Infinity Uniquers&#8221;, &#8220;we&#8221;, &#8220;us&#8221;, or &#8220;our&#8221;) operates{" "}
            <strong className="font-semibold text-[#171B22]">Infinity Client Finder</strong>, a business lead discovery and sales
            intelligence application available through <strong className="font-semibold text-[#171B22]">Meet to Manage</strong>.
          </p>
          <p>
            This Privacy Policy explains how we collect, use, store, share, and protect information when you use our application
            and related services.
          </p>
          <p>By using our application, you agree to the practices described in this Privacy Policy.</p>
        </div>

        <div className="mt-10 flex flex-col gap-4">
          {SECTIONS_1_TO_7.map((section) => (
            <Section key={section.h2} {...section} />
          ))}

          {/* Section 8 — Data Deletion. Kept out of the arrays above since it's the only
              section (besides 15) with inline mailto links rather than plain bullet text. */}
          <section>
            <h2 className="font-display mt-8 text-xl font-bold tracking-tight text-[#171B22]">8. Data Deletion</h2>
            <div className="mt-3 flex flex-col gap-3 text-base leading-relaxed text-[#5B6472]">
              <p>Users may request deletion of their account and eligible personal information.</p>
              <p>To request deletion of your information, contact us at:</p>
              <p>
                <strong className="font-semibold text-[#171B22]">Email:</strong>{" "}
                <a href="mailto:info@infinityuniquers.com" className="font-medium text-[#EA580C] hover:underline">
                  info@infinityuniquers.com
                </a>
              </p>
              <p>Please include enough information for us to identify your account and process the request.</p>
              <p>
                If you disconnect a social media account, we will stop accessing new information through that connection, subject
                to applicable platform requirements and any information that we are legally required to retain.
              </p>
              <p>Some information may need to be retained where required by law or for legitimate security, fraud-prevention, or legal purposes.</p>
            </div>
          </section>

          {SECTIONS_9_TO_14.map((section) => (
            <Section key={section.h2} {...section} />
          ))}

          {/* Section 15 — Contact Us. Also kept separate for the same reason (labeled contact
              details with links, not bullet text). */}
          <section>
            <h2 className="font-display mt-8 text-xl font-bold tracking-tight text-[#171B22]">15. Contact Us</h2>
            <div className="mt-3 flex flex-col gap-2 text-base leading-relaxed text-[#5B6472]">
              <p>If you have questions, concerns, or requests regarding this Privacy Policy or your personal information, please contact us:</p>
              <p className="mt-2 font-semibold text-[#171B22]">Infinity Uniquers</p>
              <p>
                <strong className="font-semibold text-[#171B22]">Email:</strong>{" "}
                <a href="mailto:info@infinityuniquers.com" className="font-medium text-[#EA580C] hover:underline">
                  info@infinityuniquers.com
                </a>
              </p>
              <p>
                <strong className="font-semibold text-[#171B22]">Website:</strong>{" "}
                <a href="https://meettomanage.cloud/" className="font-medium text-[#EA580C] hover:underline">
                  https://meettomanage.cloud/
                </a>
              </p>
              <p>
                <strong className="font-semibold text-[#171B22]">Privacy Policy:</strong>{" "}
                <a href="https://meettomanage.cloud/policy" className="font-medium text-[#EA580C] hover:underline">
                  https://meettomanage.cloud/policy
                </a>
              </p>
            </div>
          </section>
        </div>

        <div className="mt-14 border-t border-black/10 pt-8 text-center text-sm text-[#5B6472]">
          <strong className="font-semibold text-[#171B22]">Infinity Client Finder</strong> is operated by{" "}
          <strong className="font-semibold text-[#171B22]">Infinity Uniquers</strong>.
        </div>
      </article>

      <footer className="border-t border-black/10 bg-[#F5F6F9] py-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row sm:text-start">
          <Logo imgClassName="h-11 w-11" />
          <p className="text-xs font-medium text-[#5B6472]">© {new Date().getFullYear()} Meet to Manage. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
