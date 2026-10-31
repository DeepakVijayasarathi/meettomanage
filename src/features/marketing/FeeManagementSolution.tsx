import { Link } from "react-router-dom";
import { SolutionFeaturePage } from "./SolutionFeaturePage";

const LINK = "font-semibold text-[#C2410C] underline";

/** Every item below is behaviour that ships in the admin, parent portal and billing flow. Add a feature here only once it ships. */
const FEATURES = [
  { title: "Fee plans with a price and a cycle", body: "Create packages that set the amount and how often it is billed. Parents are billed the plan's price each cycle." },
  { title: "Invoices created automatically", body: "Attach a child to a plan and the first invoice is issued straight away, or on a future start date. The auto-billing job then issues each following invoice." },
  { title: "Choose when a batch is paid", body: "For each batch pick one of three options: payment already made in full, payment after a set number of sessions, or payment due on a fixed date." },
  { title: "Collect online through Razorpay or Cashfree", body: "Families pay through the gateway's checkout, so card details are entered with the gateway and never with you. Razorpay payments are checked on the server before an invoice is marked paid." },
  { title: "Part payments", body: "When a family pays in instalments they can pay any part of the balance, or the whole of it, from the same invoice." },
  { title: "Cash, recorded properly", body: "A parent can say they will pay by cash from their portal. Your centre confirms it once the money is actually collected, so cash payments are on the record too." },
  { title: "Reminders, then automatic pausing", body: "Reminders go out for unpaid fees. Access can pause when a payment is overdue and returns the moment the family pays, with no manual follow-up." },
  { title: "Invoices you can download", body: "Open any invoice to see what was billed and paid, and download it as a PDF for the family or your own records." },
  { title: "Refund requests with a decision trail", body: "A refund is raised from the invoice and waits for your centre's decision, so every approval or rejection is recorded." },
  { title: "Cancel billing without losing history", body: "Stop a child's auto-billing when they leave a plan. Invoices already issued stay exactly as they are." },
];

export default function FeeManagementSolution() {
  return (
    <SolutionFeaturePage
      eyebrow="Fees and billing"
      title="Fee management software for coaching centres and online academies."
      sub="Plans, automatic invoices, online and cash payments, reminders and refunds in one place, connected to classes and the parent app."
      seo={{
        title: "Fee Management Software for Coaching Centres and Schools | Meet to Manage",
        description: "Automatic invoices, online fee collection through Razorpay or Cashfree, part payments, cash confirmation, reminders and refunds. Built into your classes and parent app.",
        path: "/solutions/fee-management-software-for-coaching-centres",
      }}
      name="Fee management software for coaching centres"
      features={FEATURES}
      closingHeading="Fees that follow the class"
      closing={
        <>
          Billing is not a separate tool. Invoices, reminders and payments sit beside your{" "}
          <Link to="/solutions/live-class-software-for-institutes" className={LINK}>live classes</Link> and{" "}
          <Link to="/solutions/online-attendance-software-for-institutes" className={LINK}>attendance</Link>, and families see and pay everything from the parent app.
          Read the <Link to="/pricing" className={LINK}>pricing</Link> or see{" "}
          <Link to="/customers" className={LINK}>how other centres use it</Link>. If you are organising fees manually, start with the <Link to="/resources/coaching-centre-fee-tracker" className={LINK}>free coaching centre fee tracker</Link>, including a worked example for partial payments and credits.
        </>
      }
    />
  );
}
