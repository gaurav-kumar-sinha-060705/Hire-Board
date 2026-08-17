import { getSupabase } from "./supabase.js";

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createEmailOTP(email, userId, purpose = "verify") {
  const otp = generateOTP();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const db = getSupabase();

  await db.from("email_otps").delete().eq("email", email.toLowerCase()).eq("purpose", purpose);

  await db.from("email_otps").insert({
    user_id: userId,
    email: email.toLowerCase(),
    otp,
    purpose,
    expires_at: expiresAt,
  });

  return otp;
}

export async function verifyEmailOTP(email, otp, purpose = "verify") {
  const db = getSupabase();
  const { data } = await db
    .from("email_otps")
    .select("*")
    .eq("email", email.toLowerCase())
    .eq("otp", otp)
    .eq("purpose", purpose)
    .gt("expires_at", Date.now())
    .maybeSingle();

  if (!data) return null;

  if (purpose === "verify") {
    await db.from("users").update({ email_verified: true }).eq("id", data.user_id);
  }

  await db.from("email_otps").delete().eq("id", data.id);

  return data.user_id;
}

export async function sendVerificationEmail(email, otp) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[DEV] Verification OTP for ${email}: ${otp}`);
    return { dev: true, otp };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const from = process.env.FROM_EMAIL || "noreply@hireboard.app";

    const { error } = await resend.emails.send({
      from: `Hire Board <${from}>`,
      to: email,
      subject: "Verify your email — Hire Board",
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1a1a1a">Verify your email</h2>
        <p style="color:#666">Use this code to verify your email. It expires in 10 minutes.</p>
        <div style="background:#f5f5f5;border-radius:8px;padding:20px;text-align:center;margin:24px 0">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1a1a1a">${otp}</span>
        </div>
        <p style="color:#999;font-size:13px">If you didn't create an account, ignore this email.</p>
      </div>`,
    });

    if (error) {
      console.log(`[EMAIL FAIL] Verification to ${email}:`, error.message);
      return { dev: true, otp };
    }

    return { dev: false };
  } catch (err) {
    console.log(`[EMAIL FAIL] Verification to ${email}:`, err.message);
    return { dev: true, otp };
  }
}

export async function sendPasswordResetEmail(email, otp) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[DEV] Password reset OTP for ${email}: ${otp}`);
    return { dev: true, otp };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const from = process.env.FROM_EMAIL || "noreply@hireboard.app";

    const { error } = await resend.emails.send({
      from: `Hire Board <${from}>`,
      to: email,
      subject: "Reset your password — Hire Board",
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1a1a1a">Reset your password</h2>
        <p style="color:#666">Use this code to reset your password. It expires in 10 minutes.</p>
        <div style="background:#f5f5f5;border-radius:8px;padding:20px;text-align:center;margin:24px 0">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1a1a1a">${otp}</span>
        </div>
        <p style="color:#999;font-size:13px">If you didn't request this, ignore this email.</p>
      </div>`,
    });

    if (error) {
      console.log(`[EMAIL FAIL] Password reset to ${email}:`, error.message);
      return { dev: true, otp };
    }

    return { dev: false };
  } catch (err) {
    console.log(`[EMAIL FAIL] Password reset to ${email}:`, err.message);
    return { dev: true, otp };
  }
}
