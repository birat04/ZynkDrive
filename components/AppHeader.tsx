"use client";

import Image from "next/image";
import Search from "@/components/Search";
import FileUploader from "@/components/FileUploader";
import { signOutUser } from "@/lib/actions/user.actions";
import { Button } from "@/components/ui/button";

const AppHeader = ({
  ownerId,
  accountId,
}: {
  ownerId: string;
  accountId: string;
}) => {
  return (
    <header className="header">
      <Search />
      <div className="header-actions">
        <FileUploader ownerId={ownerId} accountId={accountId} />
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

export default AppHeader;
