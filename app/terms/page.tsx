export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 prose-sm">
      <h1 className="text-2xl font-semibold">Terms of Use</h1>
      <p className="mt-2 text-xs text-foreground/50">
        Draft — placeholder terms for development. Have this reviewed by counsel before
        launch.
      </p>

      <h2 className="mt-8 font-semibold">The service</h2>
      <p className="mt-2 text-sm text-foreground/80">
        Room3D lets you upload a hand-drawn room sketch and generates an AI-assisted 3D
        render of the space. Renders are an interpretive visualization, not an
        architectural or engineering drawing, and should not be relied on for
        construction, permitting, or structural decisions.
      </p>

      <h2 className="mt-8 font-semibold">Free tier and Pro subscription</h2>
      <p className="mt-2 text-sm text-foreground/80">
        Free accounts include AI processing up to US$10 of token spend. Once reached, you
        must upgrade to a Pro subscription (A$20/month) to keep generating renders. Pro
        subscriptions can be upgraded, downgraded, or canceled at any time from your
        account page; cancellation takes effect at the end of the current billing period.
      </p>

      <h2 className="mt-8 font-semibold">Your content</h2>
      <p className="mt-2 text-sm text-foreground/80">
        You retain ownership of the sketches you upload and the renders generated from
        them. You&apos;re responsible for having the right to upload and share any sketch
        you submit, and for the accuracy of any dimensions you confirm.
      </p>

      <h2 className="mt-8 font-semibold">Acceptable use</h2>
      <p className="mt-2 text-sm text-foreground/80">
        Don&apos;t use the service to upload content you don&apos;t have rights to, or to
        attempt to abuse, overload, or reverse engineer the AI processing pipeline.
      </p>
    </div>
  );
}
