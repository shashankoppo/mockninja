import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");

    if (!razorpayKeySecret) {
      return new Response(JSON.stringify({ error: "Gateway not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    const razorpaySignature = req.headers.get("x-razorpay-signature");
    const expectedSignature = createHmac("sha256", webhookSecret || razorpayKeySecret)
      .update(rawBody)
      .digest("hex");

    if (!razorpaySignature || razorpaySignature !== expectedSignature) {
      console.error("Webhook signature verification failed");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = body.event;
    const paymentEntity = body.payload?.payment?.entity;

    if (!paymentEntity) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const razorpayOrderId = paymentEntity.order_id;
    const razorpayPaymentId = paymentEntity.id;
    const paymentStatus = paymentEntity.status;
    const paymentMethod = paymentEntity.method;

    const { data: txn } = await supabase
      .from("transactions")
      .select("id, user_id, plan_id, amount_inr, status, promo_code_id")
      .eq("razorpay_order_id", razorpayOrderId)
      .maybeSingle();

    if (!txn) {
      console.error("No transaction found for razorpay_order_id:", razorpayOrderId);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event === "payment.captured" || (event === "payment.authorized" && paymentStatus === "captured")) {
      if (txn.status === "SUCCESS") {
        return new Response(JSON.stringify({ received: true, message: "Already processed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("transactions")
        .update({
          status: "SUCCESS",
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: razorpaySignature,
          payment_method: paymentMethod?.toUpperCase() || "RAZORPAY",
        })
        .eq("id", txn.id);

      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("id, name, billing_period")
        .eq("id", txn.plan_id)
        .maybeSingle();

      if (plan) {
        const now = new Date();
        let expiresAt: string | null = null;
        if (plan.billing_period === "YEARLY") {
          expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
        } else if (plan.billing_period === "QUARTERLY") {
          expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
        } else {
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        await supabase
          .from("user_subscriptions")
          .update({ status: "EXPIRED" })
          .eq("user_id", txn.user_id)
          .eq("status", "ACTIVE");

        await supabase
          .from("user_subscriptions")
          .insert({
            user_id: txn.user_id,
            plan_id: plan.id,
            status: "ACTIVE",
            expires_at: expiresAt,
            razorpay_payment_id: razorpayPaymentId,
          });

        if (txn.promo_code_id) {
          await supabase.rpc("sync_promo_used_count");
        }
      }

      await supabase
        .from("notification_log")
        .insert({
          user_id: txn.user_id,
          type: "PAYMENT_SUCCESS",
          title: "Payment Successful",
          body: `Your payment of ₹${txn.amount_inr} was successful. Your plan is now active.`,
        });
    } else if (event === "payment.failed") {
      const failReason = paymentEntity.error_description || paymentEntity.error_reason || "Payment failed";
      await supabase
        .from("transactions")
        .update({
          status: "FAILED",
          razorpay_payment_id: razorpayPaymentId,
          failure_reason: failReason,
        })
        .eq("id", txn.id);

      await supabase
        .from("notification_log")
        .insert({
          user_id: txn.user_id,
          type: "PAYMENT_FAILED",
          title: "Payment Failed",
          body: `Your payment of ₹${txn.amount_inr} could not be processed: ${failReason}`,
        });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("razorpay-webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
// deploy v2
