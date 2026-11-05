import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { BadgeCheck, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { verifyCertificate, type ApiCertificateCheck } from "@/api/certificates";

type State = { kind: "loading" } | { kind: "found"; result: ApiCertificateCheck } | { kind: "missing" } | { kind: "error" };

/** Public page behind a certificate's QR code: confirms it's genuine without showing private details. */
export default function VerifyCertificate() {
  const { code = "" } = useParams();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    verifyCertificate(code)
      .then((result) => setState({ kind: "found", result }))
      .catch((e) => setState(e instanceof ApiError && e.status === 404 ? { kind: "missing" } : { kind: "error" }));
  }, [code]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Helmet><title>Verify certificate</title><meta name="robots" content="noindex" /></Helmet>
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center"><Logo /></div>
        {state.kind === "loading" && <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />}
        {state.kind === "found" && (state.result.valid ? (
          <>
            <BadgeCheck className="mx-auto h-14 w-14 text-success" />
            <h1 className="mt-3 text-xl font-bold">Genuine certificate</h1>
            <p className="mt-4 text-2xl font-semibold">{state.result.studentName}</p>
            <p className="text-muted-foreground">completed</p>
            <p className="text-lg font-semibold">{state.result.courseName}</p>
            <p className="mt-4 text-sm text-muted-foreground">Issued by {state.result.academyName} on {formatDate(state.result.issuedAtUtc, "long")}</p>
          </>
        ) : (
          <>
            <ShieldAlert className="mx-auto h-14 w-14 text-destructive" />
            <h1 className="mt-3 text-xl font-bold">This certificate was withdrawn</h1>
            <p className="mt-2 text-sm text-muted-foreground">{state.result.academyName} has revoked certificate {state.result.code}. Contact the academy if you have questions.</p>
          </>
        ))}
        {state.kind === "missing" && (
          <>
            <XCircle className="mx-auto h-14 w-14 text-destructive" />
            <h1 className="mt-3 text-xl font-bold">No certificate found</h1>
            <p className="mt-2 text-sm text-muted-foreground">Check the code <span className="font-mono">{code}</span> and try again.</p>
          </>
        )}
        {state.kind === "error" && <p className="text-sm text-muted-foreground">We couldn&apos;t check this certificate right now. Please try again in a moment.</p>}
        <p className="mt-6 font-mono text-xs text-muted-foreground">{code.toUpperCase()}</p>
      </div>
    </div>
  );
}
