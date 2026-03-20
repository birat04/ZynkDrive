"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { navItems } from "@/constants";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import FileUploader from "@/components/FileUploader";
import { signOutUser } from "@/lib/actions/user.actions";

const MobileNavigation = ({
  ownerId,
  accountId,
  fullName,
  avatar,
  email,
}: MobileNavigationProps) => {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="mobile-nav">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Image
              src="/assets/icons/menu.svg"
              alt="Menu"
              width={24}
              height={24}
            />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="mobile-nav-sheet w-[280px] sm:max-w-[280px]"
        >
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <Image
                src="/assets/icons/logo-brand.svg"
                alt="ZynkDrive"
                width={28}
                height={28}
              />
              ZynkDrive
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex flex-1 flex-col gap-4">
            <div className="flex items-center gap-3 rounded-2xl bg-light-300 p-3">
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

            <FileUploader
              ownerId={ownerId}
              accountId={accountId}
              className="w-full justify-center"
            />

            <nav className="flex flex-col gap-1">
              {navItems.map(({ url, name, icon }) => (
                <Link
                  key={url}
                  href={url}
                  onClick={() => setOpen(false)}
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

            <form action={signOutUser} className="mt-auto pt-4">
              <Button
                type="submit"
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <Image
                  src="/assets/icons/logout.svg"
                  alt=""
                  width={20}
                  height={20}
                />
                Logout
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2">
        <Image
          src="/assets/icons/logo-brand.svg"
          alt="ZynkDrive"
          width={28}
          height={28}
        />
        <span className="h5 text-light-100">ZynkDrive</span>
      </div>
    </div>
  );
};

export default MobileNavigation;
