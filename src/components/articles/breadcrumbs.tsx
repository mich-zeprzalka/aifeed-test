import { Fragment } from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbItemData {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItemData[];
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
      <Breadcrumb>
        <BreadcrumbList className="text-[12px] font-mono text-muted-foreground/70">
          {items.map((item, i) => (
            <Fragment key={i}>
              {i > 0 && (
                <BreadcrumbSeparator className="[&>svg]:size-3 text-muted-foreground/40" />
              )}
              <BreadcrumbItem>
                {item.href ? (
                  <BreadcrumbLink
                    render={<Link href={item.href} />}
                    className="hover:text-foreground truncate max-w-[200px]"
                  >
                    {item.label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="text-muted-foreground truncate max-w-[300px] font-normal">
                    {item.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
}
