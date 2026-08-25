import SignupForm from "@/components/SignupForm";

export default function SignupPage() {
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  return (
    <div className="mx-auto max-w-md px-4 py-16 w-full">
      <SignupForm googleEnabled={googleEnabled} />
    </div>
  );
}
