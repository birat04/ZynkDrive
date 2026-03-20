"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { OTPModal } from "@/components/OTPModal";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createAccount, signInUser } from "@/lib/actions/user.actions";

export type AuthFormType = "sign-in" | "sign-up";

const makeSchema = (type: AuthFormType) =>
  z.object({
    fullName: type === "sign-up" ? z.string().min(2, "Full name is required") : z.string().optional(),
    email: z.string().email("Enter a valid email"),
  });

export default function AuthForm({ type }: { type: AuthFormType }) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [otpAccountId, setOtpAccountId] = useState<string | null>(null);
  const [otpEmail, setOtpEmail] = useState<string | null>(null);

  const schema = useMemo(() => makeSchema(type), [type]);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (type === "sign-up") {
        const result = await createAccount({
          fullName: values.fullName || "",
          email: values.email,
        });

        if (!result?.accountId) throw new Error("Unable to create account.");
        setOtpAccountId(result.accountId);
        setOtpEmail(values.email);
        return;
      }

      const result = await signInUser({ email: values.email });
      if (!result?.accountId) throw new Error("No account found for this email.");

      setOtpAccountId(result.accountId);
      setOtpEmail(values.email);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-drop-1 sm:p-8">
        <div className="flex items-center justify-center gap-2">
          <Image src="/assets/icons/logo-brand.svg" alt="ZynkDrive" width={32} height={32} />
          <p className="h4 text-light-100">ZynkDrive</p>
        </div>

        <h1 className="h2 mt-6 text-center text-light-100">
          {type === "sign-in" ? "Sign in" : "Create your account"}
        </h1>
        <p className="body-2 mt-2 text-center text-light-200">
          {type === "sign-in" ? "Enter your email to receive a one-time code." : "Enter your details to get started."}
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5">
            {type === "sign-up" && (
              <FormField
                control={form.control}
                name={"fullName"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="body-2 text-light-100">Full name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" className="shad-input" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name={"email"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="body-2 text-light-100">Email</FormLabel>
                  <FormControl>
                    <Input placeholder="you@company.com" className="shad-input" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="primary-btn w-full" disabled={isLoading}>
              {type === "sign-in" ? "Send code" : "Create account"}
              {isLoading && (
                <Image
                  src="/assets/icons/loader.svg"
                  alt="Loading"
                  width={18}
                  height={18}
                  className="ml-2 animate-spin"
                />
              )}
            </Button>

            {errorMessage && <p className="body-2 text-center text-red">{errorMessage}</p>}

            <p className="body-2 text-center text-light-200">
              {type === "sign-in" ? "New here?" : "Already have an account?"}{" "}
              <Link
                href={type === "sign-in" ? "/sign-up" : "/sign-in"}
                className="font-medium text-brand hover:text-brand-100"
              >
                {type === "sign-in" ? "Create an account" : "Sign in"}
              </Link>
            </p>
          </form>
        </Form>
      </div>

      {otpAccountId && otpEmail && (
        <OTPModal
          accountId={otpAccountId}
          email={otpEmail}
          onClose={() => {
            setOtpAccountId(null);
            setOtpEmail(null);
          }}
        />
      )}
    </>
  );
}
