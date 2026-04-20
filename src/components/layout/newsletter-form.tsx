"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";

interface NewsletterFormProps {
  variant?: "default" | "compact";
}

export function NewsletterForm({ variant = "default" }: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage("Zapisano! Dziękujemy za subskrypcję.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Nie udało się zapisać.");
      }
    } catch {
      setStatus("error");
      setMessage("Wystąpił błąd połączenia.");
    }
  };

  if (status === "success") {
    return (
      <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
        <Check className="size-3.5" />
        <span>{message}</span>
      </div>
    );
  }

  const isCompact = variant === "compact";

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        required
        aria-label="Adres email do newslettera"
        placeholder="twoj@email.pl"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (status === "error") setStatus("idle");
        }}
        className={`min-w-0 flex-1 rounded-lg border bg-card text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all ${
          status === "error"
            ? "border-destructive"
            : "border-border"
        } ${isCompact ? "px-3 py-2" : "px-4 py-2.5"}`}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className={`shrink-0 rounded-lg bg-foreground font-medium text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 ${
          isCompact ? "px-4 py-2 text-sm" : "px-5 py-2.5 text-sm font-bold"
        }`}
      >
        {status === "loading" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : isCompact ? (
          "Wyślij"
        ) : (
          "Zapisz się"
        )}
      </button>
    </form>
  );
}
