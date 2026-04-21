import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Strona nie znaleziona",
  description: "Strona, której szukasz nie istnieje bądź została przeniesiona.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="mb-4 text-8xl font-heading font-extrabold text-muted-foreground/10 tracking-tighter">
        404
      </p>
      <h1
        className="mb-3 text-2xl font-bold font-heading tracking-tight"
      >
        Strona nie znaleziona
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Strona, której szukasz nie istnieje bądź została przeniesiona. Spróbuj wybrać inną stronę.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Wróć do strony głównej
      </Link>
    </div>
  );
}
