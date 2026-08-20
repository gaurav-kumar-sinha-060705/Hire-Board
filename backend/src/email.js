import crypto from "crypto";
import { getSupabase } from "./supabase.js";

function generateOTP() {
  return String(crypto.randomInt(100000, 999999));
}

export async function createEmailOTP(email, userId, purpose = "verify") {
  const db = getSupabase();
  const now = Date.now();
  const tenMinAgo = now - 10 * 60 * 1000;

  // Lazy cleanup: deactivate OTPs older than 10 minutes
  const { error: deactivateErr } = await db
    .from("email_otps")
    .update({ active: false })
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .eq("active", true)
    .lt("created_at", new Date(tenMinAgo).toISOString());
  if (deactivateErr) console.log("[OTP] Deactivate cleanup failed:", deactivateErr.message);

  // Lazy cleanup: delete inactive OTPs from previous days (midnight local wipe)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { error: deleteErr } = await db
    .from("email_otps")
    .delete()
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .eq("active", false)
    .lt("created_at", todayStart.toISOString());
  if (deleteErr) console.log("[OTP] Delete cleanup failed:", deleteErr.message);

  // Count ALL OTPs generated today (active + inactive) for daily limit
  const { count, error: countErr } = await db
    .from("email_otps")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .gte("created_at", todayStart.toISOString());

  if (countErr || count == null) {
    console.log("[OTP] Count query failed:", countErr?.message || "count is null");
    throw new Error("Verification service is temporarily unavailable.");
  }
  if (count >= 2) {
    throw new Error("Daily OTP limit reached. Try again tomorrow.");
  }

  // Check cooldown: most recent active OTP must be at least 10 min old
  const { data: recent, error: recentErr } = await db
    .from("email_otps")
    .select("created_at")
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentErr) {
    console.log("[OTP] Cooldown query failed:", recentErr.message);
    throw new Error("Verification service is temporarily unavailable.");
  }
  if (recent) {
    const lastSent = new Date(recent.created_at).getTime();
    if (now - lastSent < 10 * 60 * 1000) {
      const waitSec = Math.ceil((10 * 60 * 1000 - (now - lastSent)) / 1000);
      throw new Error(`Wait ${waitSec} seconds before requesting another code.`);
    }
  }

  // Insert new OTP
  const otp = generateOTP();
  const { error: insErr } = await db.from("email_otps").insert({
    user_id: userId,
    email: email.toLowerCase(),
    otp,
    purpose,
    active: true,
  });

  if (insErr) {
    console.log("[OTP] Insert failed:", insErr.message);
    throw new Error("Verification service is temporarily unavailable.");
  }

  return otp;
}

export async function verifyEmailOTP(email, otp, purpose = "verify") {
  const db = getSupabase();
  const now = Date.now();
  const tenMinAgo = now - 10 * 60 * 1000;

  // Find matching active OTP created within the last 10 minutes
  const { data } = await db
    .from("email_otps")
    .select("*")
    .eq("email", email.toLowerCase())
    .eq("otp", otp)
    .eq("purpose", purpose)
    .eq("active", true)
    .gte("created_at", new Date(tenMinAgo).toISOString())
    .maybeSingle();

  if (!data) {
    return null;
  }

  if (purpose === "verify") {
    await db.from("users").update({ email_verified: true }).eq("id", data.user_id);
  }

  // Mark this OTP as inactive (don't delete)
  await db.from("email_otps").update({ active: false }).eq("id", data.id);

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
    const from = process.env.FROM_EMAIL || "otp@hireboard.dpdns.org";

    const result = await resend.emails.send({
      from: `Hire Board <${from}>`,
      to: email,
      subject: "Verify your email — Hire Board",
      text: `Your Hire Board verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't create an account, you can ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <p>Your Hire Board verification code is:</p>
        <p style="font-size:24px;font-weight:bold">${otp}</p>
        <p>This code expires in 10 minutes.</p>
        <p style="color:#777;font-size:13px">If you didn't create an account, you can ignore this email.</p>
      </div>`,
    });

    if (result.error) {
      const err = result.error;
      if (err.statusCode === 429) {
        return { limited: true };
      }
      console.log(`[EMAIL BOUNCE] to ${email}:`, err.message, err.name || "");
      return { bounced: true, reason: err.message };
    }

    return { sent: true };
  } catch (err) {
    console.log(`[EMAIL FAIL] to ${email}:`, err.message);
    return { bounced: true, reason: err.message };
  }
}
