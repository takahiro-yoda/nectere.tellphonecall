import Link from "next/link";
import type { CallProfileLink as CallProfileLinkData } from "@/lib/callProfileLink";
import { callProfileLinkLabel } from "@/lib/callProfileLink";

type Props = {
  profile: CallProfileLinkData | null;
  className?: string;
  /** compact: ヘッダー用のボタン風 */
  variant?: "button" | "inline";
};

export function CallProfileLink({ profile, className = "", variant = "button" }: Props) {
  if (!profile) return null;

  const label = callProfileLinkLabel(profile.type);
  const base =
    variant === "button"
      ? "inline-flex items-center rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm transition"
      : "inline-flex items-center text-sm font-semibold underline-offset-2 hover:underline";

  const color =
    profile.type === "customer"
      ? "border-violet-300 bg-violet-50 text-violet-900 hover:bg-violet-100"
      : "border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100";

  return (
    <Link
      href={profile.href}
      className={`${base} ${variant === "button" ? color : profile.type === "customer" ? "text-violet-800" : "text-rose-800"} ${className}`.trim()}
      title={`${label}: ${profile.destination}`}
    >
      {label}
    </Link>
  );
}
