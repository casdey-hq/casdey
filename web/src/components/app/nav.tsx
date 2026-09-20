"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { IconFind, IconMessage } from "@/components/marks/icons";
import { IconCalendar, IconOverview, IconSettings, IconUpload } from "./icons";
import { IconOffer } from "./icons";

export const APP_LINKS = [
  { href: "/app", label: "Overview", Icon: IconOverview, exact: true },
  { href: "/app/members", label: "Members", Icon: IconFind, exact: false },
  { href: "/app/import", label: "Import", Icon: IconUpload, exact: false },
  { href: "/app/offer", label: "Offer", Icon: IconOffer, exact: false },
  { href: "/app/campaigns", label: "Campaigns", Icon: IconMessage, exact: false },
  { href: "/app/calendar", label: "Bookings", Icon: IconCalendar, exact: false },
  { href: "/app/settings", label: "Settings", Icon: IconSettings, exact: false },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections" className="flex gap-1 md:flex-col">
      {APP_LINKS.map(({ href, label, Icon, exact }, index) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <div key={href} className="contents md:block">
            {index === 0 || index === 4 || index === 6 ? (
              <p className="nav-section-label hidden md:block">
                {index === 0 ? "Workspace" : index === 4 ? "Engage" : "Manage"}
              </p>
            ) : null}
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className="app-nav-link group"
            >
              <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" />
              {label}
              {active ? <span className="nav-active-mark" aria-hidden="true" /> : null}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
