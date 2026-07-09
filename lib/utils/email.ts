interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const getEmailConfig = () => ({
  provider: process.env.EMAIL_PROVIDER || "resend",
  apiKey: process.env.EMAIL_API_KEY,
  from: process.env.EMAIL_FROM || "noreply@zynkdrive.app",
  fromName: process.env.EMAIL_FROM_NAME || "ZynkDrive",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
}: SendEmailParams): Promise<void> => {
  const { provider, apiKey, from, fromName } = getEmailConfig();

  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.info("[email:dev]", { to, subject, text: text || html });
      return;
    }
    throw new Error("EMAIL_API_KEY is not configured");
  }

  if (provider === "sendgrid") {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from, name: fromName },
        subject,
        content: [
          ...(text ? [{ type: "text/plain", value: text }] : []),
          { type: "text/html", value: html },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`SendGrid error: ${response.status}`);
    }
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${from}>`,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend error: ${response.status}`);
  }
};

export const sendVerificationEmail = async (email: string, token: string) => {
  const { appUrl } = getEmailConfig();
  const verifyUrl = `${appUrl}/verify?token=${token}&email=${encodeURIComponent(email)}`;

  await sendEmail({
    to: email,
    subject: "Verify your ZynkDrive email",
    text: `Verify your email by visiting: ${verifyUrl}`,
    html: `
      <p>Thanks for signing up for ZynkDrive.</p>
      <p><a href="${verifyUrl}">Verify your email address</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const { appUrl } = getEmailConfig();
  const resetUrl = `${appUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

  await sendEmail({
    to: email,
    subject: "Reset your ZynkDrive password",
    text: `Reset your password by visiting: ${resetUrl}`,
    html: `
      <p>We received a request to reset your password.</p>
      <p><a href="${resetUrl}">Reset password</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
};
