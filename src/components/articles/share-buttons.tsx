"use client";

import { useState, useMemo, useSyncExternalStore } from "react";
import { Share2, Link2, Check } from "lucide-react";
import { siteConfig } from "@/config/site";

interface ShareButtonsProps {
  url: string;
  title: string;
}

const SHARE_LINK_REL = "nofollow noopener noreferrer";
const noopSubscribe = () => () => {};
const getNativeShare = () =>
  typeof navigator !== "undefined" && typeof navigator.share === "function";
const getNativeShareServer = () => false;

function extractTwitterHandle(twitterUrl: string): string | null {
  const match = twitterUrl.match(/(?:twitter\.com|x\.com)\/([^/?#]+)/i);
  return match ? match[1] : null;
}

export function ShareButtons({ url, title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const canNativeShare = useSyncExternalStore(
    noopSubscribe,
    getNativeShare,
    getNativeShareServer
  );

  const { twitterHref, linkedInHref, facebookHref } = useMemo(() => {
    const shareUrl = encodeURIComponent(url);
    const shareTitle = encodeURIComponent(title);
    const viaHandle = extractTwitterHandle(siteConfig.links.twitter);
    const viaParam = viaHandle ? `&via=${encodeURIComponent(viaHandle)}` : "";

    return {
      twitterHref: `https://x.com/intent/tweet?url=${shareUrl}&text=${shareTitle}${viaParam}`,
      linkedInHref: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
      facebookHref: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
    };
  }, [url, title]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      // User cancelled — ignore
    }
  };

  const buttonClass =
    "inline-flex size-9 items-center justify-center rounded-lg border border-border/50 bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors";

  return (
    <div className="flex items-center gap-1.5">
      <a
        href={twitterHref}
        target="_blank"
        rel={SHARE_LINK_REL}
        className={buttonClass}
        aria-label={`Udostępnij "${title}" na X`}
        title="Udostępnij na X"
      >
        <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>

      <a
        href={linkedInHref}
        target="_blank"
        rel={SHARE_LINK_REL}
        className={buttonClass}
        aria-label={`Udostępnij "${title}" na LinkedIn`}
        title="Udostępnij na LinkedIn"
      >
        <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </a>

      <a
        href={facebookHref}
        target="_blank"
        rel={SHARE_LINK_REL}
        className={buttonClass}
        aria-label={`Udostępnij "${title}" na Facebooku`}
        title="Udostępnij na Facebooku"
      >
        <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </a>

      <button
        type="button"
        onClick={handleCopyLink}
        className={buttonClass}
        aria-label={copied ? "Skopiowano link" : "Kopiuj link"}
        title={copied ? "Skopiowano" : "Kopiuj link"}
      >
        {copied ? (
          <Check className="size-3 text-green-500" aria-hidden="true" />
        ) : (
          <Link2 className="size-3.5" aria-hidden="true" />
        )}
      </button>

      {canNativeShare && (
        <button
          type="button"
          onClick={handleNativeShare}
          className={`${buttonClass} sm:hidden`}
          aria-label="Udostępnij przez system"
          title="Udostępnij"
        >
          <Share2 className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
