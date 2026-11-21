import { createClient } from "npm:@supabase/supabase-js@2";
import {
  callProvider,
  costPaise,
  PROVIDER_NAMES,
  providerKeyName,
  type ProviderName,
  type ProviderSettings,
} from "./providers.ts";
import { buildPrompt, isValidQuestion, type GeneratedQuestion } from "./prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const DEFAULT_SETTINGS: ProviderSettings = {
  provider: "gemini",
  model: "gemini-2.5-flash",
  input_paise_per_million: 2500,
  output_paise_per_million: 21000,
};

type GenMode = "questions" | "dpp" | "mock_test";

function parseSettings(value: unknown): ProviderSettings | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const provider = v.provider;
  if (typeof provider !== "string" || !PROVIDER_NAMES.includes(provider as ProviderName)) return null;
  if (typeof v.model !== "string" || v.model.trim().length === 0) return null;
  const inPrice = Number(v.input_paise_per_million);
  const outPrice = Number(v.output_paise_per_million);
  if (!Number.isFinite(inPrice) || !Number.isFinite(outPrice) || inPrice < 0 || outPrice < 0) return null;
  return {
    provider: provider as ProviderName,
    model: v.model.trim(),
    input_paise_per_million: inPrice,
    output_paise_per_million: outPrice,
  };
}

function parseAiText(text: string): unknown[] | null {
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);
  let jobId: string | null = null;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Sign in required" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Sign in required" }, 401);
    const userId = userData.user.id;

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (profile?.role !== "ADMIN") return json({ error: "Admin access required" }, 403);

    const body = await req.json().catch(() => null);
    const mode: GenMode = body?.mode === "dpp" || body?.mode === "mock_test" ? body.mode : "questions";
    const chapterId = Number(body?.chapter_id);
    const count = Number(body?.count);
    const type = body?.type;
    const difficulty = body?.difficulty;
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const durationMin = Number(body?.duration_min) || (mode === "dpp" ? 60 : 180);

    if (!Number.isInteger(chapterId) || chapterId <= 0) return json({ error: "Choose a chapter" }, 400);
    if (!Number.isInteger(count) || count < 1 || count > 10) return json({ error: "Ask for 1 to 10 questions" }, 400);
    if (!["MCQ", "NUMERICAL"].includes(type)) return json({ error: "Invalid question type" }, 400);
    if (!["EASY", "MEDIUM", "HARD"].includes(difficulty)) return json({ error: "Invalid difficulty" }, 400);
    if ((mode === "dpp" || mode === "mock_test") && !title) return json({ error: "A title is required for tests and DPPs" }, 400);

    const { data: settingRow, error: settingError } = await admin
      .from("platform_settings")
      .select("value")
      .eq("key", "AI_PROVIDER_SETTINGS")
      .maybeSingle();
    if (settingError) throw settingError;
    const settings = parseSettings(settingRow?.value) ?? DEFAULT_SETTINGS;

    const apiKey = Deno.env.get(providerKeyName(settings.provider));
    if (!apiKey) {
      return json({ error: `AI provider ${settings.provider} is not configured yet` }, 503);
    }

    const { data: chapter, error: chapterError } = await admin
      .from("chapters")
      .select("id, name, subject:subject_id(name)")
      .eq("id", chapterId)
      .maybeSingle();
    if (chapterError) throw chapterError;
    if (!chapter) return json({ error: "Chapter not found" }, 404);
    const subjectName = (chapter.subject as unknown as { name: string } | null)?.name ?? "";

    const { data: job, error: jobError } = await admin
      .from("ai_generation_jobs")
      .insert({
        requested_by: userId,
        chapter_id: chapterId,
        question_type: type,
        difficulty,
        requested_count: count,
        provider: settings.provider,
        model: settings.model,
        status: "RUNNING",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (jobError) throw jobError;
    jobId = job.id;

    const prompt = buildPrompt(subjectName, chapter.name, type, difficulty, count);
    const result = await callProvider(settings.provider, settings.model, prompt, apiKey);
    const tokensIn = result.tokensIn;
    const tokensOut = result.tokensOut;
    const cost = costPaise(tokensIn, tokensOut, settings);

    const parsed = parseAiText(result.text);
    const valid = parsed ? (parsed as GeneratedQuestion[]).filter((q) => isValidQuestion(q, type)) : [];
    const skipped = parsed ? parsed.length - valid.length : 0;

    let created = 0;
    let mockTestId: string | null = null;

    if (valid.length > 0) {
      const questionRows = valid.map((q) => ({
        chapter_id: chapterId,
        type,
        difficulty,
        statement_tex: q.statement_tex.trim(),
        options_json: type === "MCQ" ? q.options : null,
        answer_json: type === "MCQ" ? { option: q.correct_option } : { value: q.correct_value },
        tolerance: type === "NUMERICAL" ? q.tolerance : null,
        solution_tex: q.solution_tex.trim(),
        review_status: "REVIEW",
        source: "AI_GENERATED",
        created_by: userId,
        ai_validation_json: {
          provider: settings.provider,
          model: settings.model,
          job_id: jobId,
          generated_at: new Date().toISOString(),
          reviewed: false,
        },
      }));
      const { data: inserted, error: insertError } = await admin.from("questions").insert(questionRows).select("id");
      if (insertError) throw insertError;
      created = inserted?.length ?? 0;

      if (created > 0 && (mode === "dpp" || mode === "mock_test")) {
        const category = mode === "dpp" ? "DPP" : "AI Generated";
        const { data: mock, error: mockError } = await admin
          .from("mock_tests")
          .insert({
            title,
            category,
            mode: "EXAM",
            duration_min: durationMin,
            total_marks: created * 4,
            access: "FREE",
            status: "DRAFT",
            kind: "AI_STUDIO",
            visibility: "PUBLIC",
            owner_user_id: userId,
            marking_scheme: {
              mcq: { correct: 4, wrong: -1 },
              numerical: { correct: 4, wrong: 0 },
            },
            meta_json: { ai_job_id: jobId, chapter_id: chapterId, difficulty },
          })
          .select("id")
          .single();
        if (mockError) throw mockError;
        mockTestId = mock.id;

        const mtqRows = (inserted ?? []).map((q, i) => ({
          mock_test_id: mockTestId,
          question_id: q.id,
          position: i + 1,
          section: "A",
        }));
        const { error: mtqError } = await admin.from("mock_test_questions").insert(mtqRows);
        if (mtqError) throw mtqError;
      }
    }

    await admin.from("ai_usage_ledger").insert({
      purpose: "STUDIO",
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_paise: cost,
      created_by: userId,
    });

    const finalStatus = parsed === null || created === 0 ? "FAILED" : "SUCCEEDED";
    const errorMessage = parsed === null
      ? "The AI response could not be read"
      : created === 0 ? "No usable questions were generated" : null;
    const { error: finishError } = await admin
      .from("ai_generation_jobs")
      .update({
        status: finalStatus,
        created_count: created,
        skipped_count: skipped,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        cost_paise: cost,
        error_message: errorMessage,
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    if (finishError) throw finishError;

    if (finalStatus === "FAILED") {
      return json({ job_id: jobId, status: "FAILED", error: `${errorMessage}. Try again.` }, 502);
    }

    const modeMessage = mode === "questions"
      ? "Questions were saved for review. They reach students only after they are published."
      : mode === "dpp"
        ? `DPP "${title}" created as a draft with ${created} questions. Review and publish it from the mock builder.`
        : `Mock test "${title}" created as a draft with ${created} questions. Review and publish it from the mock builder.`;

    return json({
      job_id: jobId,
      status: "SUCCEEDED",
      mode,
      created,
      skipped,
      mock_test_id: mockTestId,
      message: modeMessage,
    });
  } catch (err) {
    console.error("generate-ai-questions failed", err);
    if (jobId) {
      await admin
        .from("ai_generation_jobs")
        .update({
          status: "FAILED",
          error_message: err instanceof Error ? err.message.slice(0, 500) : "Unknown error",
          finished_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }
    return json({ job_id: jobId, status: "FAILED", error: "Question generation failed. Try again." }, 500);
  }
});
