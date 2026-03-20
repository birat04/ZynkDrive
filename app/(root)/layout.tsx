import { getCurrentUser } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import MobileNavigation from "@/components/MobileNavigation";
import AppHeader from "@/components/AppHeader";
import { Toaster } from "sonner";

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) return redirect("/sign-in");

  const fullName = (currentUser.fullName as string) ?? "User";
  const avatar = (currentUser.avatar as string) ?? "";
  const email = (currentUser.email as string) ?? "";
  const userId = (currentUser.$id as string) ?? "";
  const accountId = (currentUser.accountId as string) ?? "";

  return (
    <div className="flex min-h-screen bg-light-400">
      <Sidebar fullName={fullName} avatar={avatar} email={email} />
      <div className="flex flex-1 flex-col sm:min-w-0">
        <MobileNavigation
          ownerId={userId}
          accountId={accountId}
          fullName={fullName}
          avatar={avatar}
          email={email}
        />
        <AppHeader ownerId={userId} accountId={accountId} />
        <main className="main-content flex-1">{children}</main>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}
