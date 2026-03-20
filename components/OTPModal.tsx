"use client";
import { useEffect, useMemo, useState } from "react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { sendEmailOTP, verifySecret } from "@/lib/actions/user.actions";

interface OTPModalProps {
  accountId: string;
  email: string;
  onClose?: () => void;
}

export const OTPModal = ({ accountId, email, onClose }: OTPModalProps) => {

  const [open, setOpen] = useState(true);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => otp.trim().length === 6 && !isLoading, [otp, isLoading]);

  useEffect(() => {
    if (!open) onClose?.();
  }, [open, onClose]);

  const onVerify = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await verifySecret({ accountId, password: otp });
    } catch (error) {
      if (error && typeof error === "object" && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) {
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "Invalid code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const onResend = async () => {
    setIsResending(true);
    setErrorMessage(null);

    try {
      await sendEmailOTP({ accountId, email });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to resend code.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enter the code</AlertDialogTitle>
          <AlertDialogDescription>
            We sent a 6-digit one-time code to <span className="font-medium">{email}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col items-center gap-4">
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          {errorMessage && <p className="body-2 text-red">{errorMessage}</p>}
        </div>

        <AlertDialogFooter>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onResend} disabled={isResending || isLoading}>
              {isResending ? "Resending..." : "Resend code"}
            </Button>
            <Button type="button" onClick={onVerify} disabled={!canSubmit}>
              {isLoading ? "Verifying..." : "Verify"}
            </Button>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

