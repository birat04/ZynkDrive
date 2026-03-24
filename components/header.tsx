"use client";

import Image from "next/image";

import Search from "@/components/Search";
import FileUploader from "@/components/FileUploader";
import { Button } from "@/components/ui/button";
import { signOutUser } from "@/lib/actions/user.actions";

interface HeaderProps {
  ownerId: string;
  accountId: string;
  fullName: string;
  avatar: string;
}

const Header = ({ ownerId, accountId, fullName, avatar }: HeaderProps) => {
  return (
    <header className="header">
      <Search />
      <div className="header-actions">
        <FileUploader ownerId={ownerId} accountId={accountId} />

        <Image
          src={avatar}
          alt={fullName}
          width={36}
          height={36}
          className="rounded-full"
        />

        <form action={signOutUser}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <Image
              src="/assets/icons/logout.svg"
              alt=""
              width={20}
              height={20}
            />
            <span>Logout</span>
          </Button>
        </form>
      </div>
    </header>
  );
};

export default Header;
