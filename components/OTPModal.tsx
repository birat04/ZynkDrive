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
import { complete2FALogin } from "@/lib/actions/auth.actions";
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
  const [requires2FA, setRequires2FA] = useState(false);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  const canSubmit = useMemo(() => {
    if (isLoading) return false;
    if (requires2FA && useRecoveryCode) return otp.trim().length >= 8;
    return otp.trim().length === 6;
  }, [otp, isLoading, requires2FA, useRecoveryCode]);

  useEffect(() => {
    if (!open) onClose?.();
  }, [open, onClose]);

  const onVerify = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (requires2FA) {
        const result = await complete2FALogin({ code: otp, useRecoveryCode });
        if (!result?.completed) {
          throw new Error("Failed to verify two-factor code.");
        }
        window.location.assign("/");
        return;
      }

      const session = await verifySecret({ accountId, password: otp });
      if (session?.requires2FA) {
        setRequires2FA(true);
        setOtp("");
        return;
      }

      if (!session?.sessionId) {
        throw new Error("Failed to verify code.");
      }

      window.location.assign("/");
    } catch (error) {
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
          <AlertDialogTitle>
            {requires2FA ? "Two-factor authentication" : "Enter the code"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {requires2FA ? (
              <>
                Enter the 6-digit code from your authenticator app
                {useRecoveryCode ? " or a recovery code" : ""}.
              </>
            ) : (
              <>
                We sent a 6-digit one-time code to <span className="font-medium">{email}</span>.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col items-center gap-4">
          {requires2FA && useRecoveryCode ? (
            <input
              className="shad-input w-full"
              value={otp}
              onChange={(event) => setOtp(event.target.value.toUpperCase())}
              placeholder="Enter recovery code"
              maxLength={16}
            />
          ) : (
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
          )}

          {requires2FA && (
            <button
              type="button"
              className="body-2 text-brand hover:text-brand-100"
              onClick={() => setUseRecoveryCode((current) => !current)}
            >
              {useRecoveryCode ? "Use authenticator code" : "Use a recovery code"}
            </button>
          )}

          {errorMessage && <p className="body-2 text-red">{errorMessage}</p>}
        </div>

        <AlertDialogFooter>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
            {!requires2FA && (
              <Button type="button" variant="outline" onClick={onResend} disabled={isResending || isLoading}>
                {isResending ? "Resending..." : "Resend code"}
              </Button>
            )}
            <Button type="button" onClick={onVerify} disabled={!canSubmit}>
              {isLoading ? "Verifying..." : requires2FA ? "Continue" : "Verify"}
            </Button>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
