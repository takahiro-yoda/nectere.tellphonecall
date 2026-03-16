import { Metadata } from "next";
import { Suspense } from "react";
import { AuthSuccessBody } from "./successBody";

export const metadata: Metadata = {
  title: "Signing in... | Nectere Call Metrics",
};

export default function AuthSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <Suspense fallback={null}>
        <AuthSuccessBody />
      </Suspense>
    </div>
  );
}

