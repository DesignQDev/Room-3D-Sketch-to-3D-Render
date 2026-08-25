import { Suspense } from "react";
import VerifyEmail from "@/components/VerifyEmail";

export default function VerifyPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 w-full">
      <h1 className="text-2xl font-semibold mb-4">Email verification</h1>
      <Suspense>
        <VerifyEmail />
      </Suspense>
    </div>
  );
}
