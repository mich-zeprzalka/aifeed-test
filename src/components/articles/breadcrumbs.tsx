import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { siteConfig } from "@/config/site";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${siteConfig.url}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-[12px] font-mono text-muted-foreground/70"
      >
        {items.map((item, i) => (
          <Fragment key={i}>
            {i > 0 && <ChevronRight className="size-3 text-muted-foreground/40" />}
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors truncate max-w-[200px]"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-muted-foreground truncate max-w-[300px]">
                {item.label}
              </span>
            )}
          </Fragment>
        ))}
      </nav>
    </>
  );
}
