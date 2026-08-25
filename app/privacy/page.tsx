export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 prose-sm">
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p className="mt-2 text-xs text-foreground/50">
        Draft — placeholder policy for development. Have this reviewed by counsel before
        launch.
      </p>

      <h2 className="mt-8 font-semibold">What we collect</h2>
      <p className="mt-2 text-sm text-foreground/80">
        Account details (name, email), sketch photos you upload, the confirmed room
        dimensions you provide, the AI-generated 3D scene data, and recipient email
        addresses when you use &quot;Send to Customer&quot;.
      </p>

      <h2 className="mt-8 font-semibold">How we use it</h2>
      <p className="mt-2 text-sm text-foreground/80">
        To generate your 3D renders, maintain your render history, deliver emails you
        send through the app, track AI processing cost against the free-tier cap, and
        operate your subscription billing.
      </p>

      <h2 className="mt-8 font-semibold">Retention</h2>
      <p className="mt-2 text-sm text-foreground/80">
        Uploaded sketches and generated renders are retained for as long as your account
        is active so you can access your render history, and are deleted within 90 days
        of account deletion. You can request earlier deletion of a specific sketch or
        render, or your full account, at any time by contacting us.
      </p>
      <p className="mt-2 text-xs text-foreground/50">
        Final retention period is an open question for stakeholder sign-off — see the
        developer brief, section 6.
      </p>

      <h2 className="mt-8 font-semibold">Logout</h2>
      <p className="mt-2 text-sm text-foreground/80">
        Logging out ends your session and clears any sketch/render data cached locally in
        your browser. Data already saved to your account (render history) remains
        available next time you log in.
      </p>

      <h2 className="mt-8 font-semibold">Payments</h2>
      <p className="mt-2 text-sm text-foreground/80">
        Subscription payments are processed by Stripe. We never see or store your raw
        card details.
      </p>
    </div>
  );
}
