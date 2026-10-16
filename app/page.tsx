import Link from "next/link";

export default function Home() {
  return (
    <div className="flex-1">
      <section className="mx-auto max-w-5xl px-4 py-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Turn a napkin sketch into a
          <span className="text-indigo-500"> realistic room render</span> in minutes
        </h1>
        <p className="mt-5 text-lg text-foreground/70 max-w-2xl mx-auto">
          Photograph your hand-drawn bathroom, kitchen or any room layout, describe the
          look and feel you&apos;re after, and get a photorealistic 3D render you can
          send straight to your customer on WhatsApp or SMS — no CAD skills required.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-indigo-600 text-white px-5 py-2.5 font-medium hover:bg-indigo-500"
          >
            Get started free
          </Link>
          <Link
            href="/pricing"
            className="rounded-md border border-black/10 dark:border-white/15 px-5 py-2.5 font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            See pricing
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-24 grid sm:grid-cols-3 gap-6">
        <FeatureCard
          step="1"
          title="Snap your sketch"
          body="Take a photo of your hand-drawn floor plan or upload one. We straighten and clean it up so the pencil lines and dimensions stay readable."
        />
        <FeatureCard
          step="2"
          title="Describe the look"
          body="Tell us the style, colours and materials you have in mind — Scandinavian, industrial, luxury hotel — and our AI renders your layout in that style."
        />
        <FeatureCard
          step="3"
          title="Share with your customer"
          body="Send the finished render to your customer over WhatsApp, SMS or email, with a link that shows a preview picture in the chat."
        />
      </section>
    </div>
  );
}

function FeatureCard({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 p-6">
      <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
        {step}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-foreground/70">{body}</p>
    </div>
  );
}
