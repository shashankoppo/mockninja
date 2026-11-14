import { createClient } from "npm:@supabase/supabase-js@2.57.4";

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
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { planSlug, promoCode, referralCode } = body;

    if (!planSlug || typeof planSlug !== "string") {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: plan, error: planError } = await adminClient
      .from("subscription_plans")
      .select("id, name, slug, price_inr, billing_period")
      .eq("slug", planSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (plan.price_inr === 0) {
      return new Response(JSON.stringify({ error: "Cannot create order for free plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const originalAmount = plan.price_inr;
    let discountInr = 0;
    let promoCodeId: string | null = null;
    let referralDiscountInr = 0;

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );

    if (promoCode && typeof promoCode === "string") {
      const { data: promoResult, error: promoErr } = await userClient.rpc("validate_promo_code", {
        p_code: promoCode.trim(),
        p_plan_slug: planSlug,
        p_amount: originalAmount,
      });
      if (!promoErr && promoResult?.[0]?.valid) {
        discountInr = promoResult[0].discount_inr;
        promoCodeId = promoResult[0].promo_code_id;
      }
    }

    if (referralCode && typeof referralCode === "string") {
      const { data: refResult, error: refErr } = await userClient.rpc("apply_referral_discount", {
        p_code: referralCode.trim(),
        p_amount: originalAmount,
      });
      if (!refErr && refResult?.[0]?.valid) {
        referralDiscountInr = refResult[0].discount_inr;
      }
    }

    const totalDiscount = discountInr + referralDiscountInr;
    const finalAmount = Math.max(0, originalAmount - totalDiscount);
    const gstAmount = Math.round(finalAmount * 0.18);
    const totalAmount = finalAmount + gstAmount;

    const invoiceNumber = `MN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const { data: txn, error: txnError } = await adminClient
      .from("transactions")
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        promo_code_id: promoCodeId,
        original_amount_inr: originalAmount,
        discount_inr: discountInr,
        referral_discount_inr: referralDiscountInr,
        amount_inr: totalAmount,
        status: "PENDING",
        payment_method: "RAZORPAY",
        invoice_number: invoiceNumber,
      })
      .select("id, invoice_number, amount_inr")
      .single();

    if (txnError || !txn) {
      return new Response(JSON.stringify({ error: "Failed to create transaction" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeyId || !razorpayKeySecret) {
      await adminClient
        .from("transactions")
        .update({ status: "FAILED", failure_reason: "Razorpay keys not configured" })
        .eq("id", txn.id);

      return new Response(JSON.stringify({ error: "Payment gateway not configured. Please contact support." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderPayload = {
      amount: totalAmount * 100,
      currency: "INR",
      receipt: invoiceNumber,
      notes: {
        transaction_id: txn.id,
        user_id: user.id,
        plan: plan.slug,
      },
    };

    const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!orderResponse.ok) {
      const errBody = await orderResponse.text();
      console.error("Razorpay order creation failed:", errBody);
      await adminClient
        .from("transactions")
        .update({ status: "FAILED", failure_reason: "Gateway error creating order" })
        .eq("id", txn.id);

      return new Response(JSON.stringify({ error: "Could not create payment order. Please try again." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const order = await orderResponse.json();

    await adminClient
      .from("transactions")
      .update({ razorpay_order_id: order.id })
      .eq("id", txn.id);

    return new Response(JSON.stringify({
      orderId: order.id,
      razorpayKeyId,
      amount: totalAmount,
      currency: "INR",
      txnId: txn.id,
      invoiceNumber: txn.invoice_number,
      planName: plan.name,
      studentName: user.email?.split("@")[0] || "Student",
      studentEmail: user.email || "",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("razorpay-order error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
// deploy v3
