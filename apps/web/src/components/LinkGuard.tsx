import Link from "next/link";
import type { Route } from "next";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type LinkGuardProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | Route;
  external?: boolean;
  children: ReactNode;
};

export default function LinkGuard({
  href,
  external,
  children,
  ...rest
}: LinkGuardProps) {
  const isExternal = external ?? /^https?:\/\//i.test(href);

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href as Route}
      {...rest}
    >
      {children}
    </Link>
  );
}
