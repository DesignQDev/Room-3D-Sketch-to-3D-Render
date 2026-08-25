import { Suspense } from "react";
import ConsentForm from "@/components/ConsentForm";

export default function ConsentPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 w-full">
      <h1 className="text-2xl font-semibold">One more thing</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Before you can use Room3D, please confirm you agree to our policies.
      </p>
      <Suspense>
        <ConsentForm />
      </Suspense>
    </div>
  );
}
