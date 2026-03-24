import type { ReactNode } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/actions/user.actions";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-brand lg:block">
          <div className="absolute inset-0">
            <Image
              src="/assets/images/files.png"
              alt="ZynkDrive"
              fill
              className="object-cover opacity-20"
              priority
            />
          </div>

          <div className="relative z-10 flex h-full flex-col justify-between p-10">
            <div className="flex items-center gap-3">
              <Image src="/assets/icons/logo-full.svg" alt="logo" width={224} height={82} className="h-auto w-auto" />
            </div>

            <div className="max-w-md text-white">
              <h1 className="h1">Manage your files with ease</h1>
              <p className="body-1 mt-4">
                Upload, organize, and share your files with a clean dashboard, fast search, and secure access.
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-col items-center justify-center p-6 sm:p-10">
          <div className="mb-10 lg:hidden">
            <Image
              src="/assets/icons/logo-full-brand.svg"
              alt="logo"
              width={224}
              height={82}
              className="h-auto w-[200px] sm:w-60"
            />
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}