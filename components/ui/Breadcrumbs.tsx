"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isMono?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  return (
    <nav className={`flex items-center text-xs text-secondary ${className}`} aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1.5">
        <li className="inline-flex items-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 hover:text-primary transition-colors text-secondary"
          >
            <span className="font-semibold text-primary">SCOPE</span>
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="inline-flex items-center space-x-1.5">
              <ChevronRight className="h-3 w-3 text-secondary/50" />
              {isLast || !item.href ? (
                <span
                  className={`text-primary font-medium ${
                    item.isMono ? "font-mono text-[11px] tracking-tight" : ""
                  }`}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={`hover:text-primary transition-colors text-secondary ${
                    item.isMono ? "font-mono text-[11px] tracking-tight" : ""
                  }`}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
