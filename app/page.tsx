import Link from "next/link";

export default function Home() {
  return (
    <div className="flex-1">
      <section className="mx-auto max-w-5xl px-4 py-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Turn a napkin sketch into a
          <span className="text-indigo-500"> 3D room render</span> in minutes
        </h1>
        <p className="mt-5 text-lg text-foreground/70 max-w-2xl mx-auto">
          Photograph a hand-drawn bathroom, kitchen, or any room layout. Our AI reads the
          walls, doors, windows and fixtures, and builds a navigable 3D model you can
          share with your customer — no CAD skills required.
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
          title="Capture the sketch"
          body="Snap a photo or upload a hand-drawn floor plan. We auto-crop and clean it up so the AI can read pencil lines and dimensions."
        />
        <FeatureCard
          step="2"
          title="AI builds the room"
          body="Claude's vision model interprets walls, openings and fixtures, and outputs a structured 3D scene in seconds."
        />
        <FeatureCard
          step="3"
          title="Share with your customer"
          body="Rotate and inspect the render in-browser, then email it straight to your customer as an image or interactive link."
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
