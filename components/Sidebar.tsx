"use client";

import Link from "next/link";
import Image from "next/image";
import { navItems } from "@/constants";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const Sidebar = ({ fullName, avatar, email }: SidebarProps) => {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/assets/icons/logo-brand.svg"
            alt="ZynkDrive"
            width={36}
            height={36}
          />
          <span className="h5 text-light-100">ZynkDrive</span>
        </Link>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ url, name, icon }) => (
          <Link
            key={url}
            href={url}
            className={cn(
              "sidebar-nav-item",
              pathname === url && "shad-active"
            )}
          >
            <Image src={icon} alt="" width={24} height={24} />
            <span>{name}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-user">
        <Image
          src={avatar}
          alt={fullName}
          width={40}
          height={40}
          className="rounded-full"
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <p className="caption truncate font-medium text-light-100">
            {fullName}
          </p>
          <p className="caption truncate text-light-200">{email}</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
