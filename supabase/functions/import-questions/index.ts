import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ParsedRow {
  chapter_id: number;
  type: string;
  difficulty: string;
  statement_tex: string;
  options_json: { id: string; text: string }[] | null;
  answer_json: { option?: string; value?: number } | null;
  tolerance: number;
  solution_tex: string | null;
  licence: string;
  source_reference: string | null;
  errors: string[];
  row_number: number;
}

const VALID_TYPES = ["MCQ", "NUMERICAL"];
const VALID_DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];
const VALID_LICENCES = ["OWNED", "LICENSED", "PUBLIC_DOMAIN", "UNKNOWN"];
const MAX_ROWS = 2000;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(field);
        field = "";
      } else if (ch === "\n") {
        current.push(field);
        rows.push(current);
        current = [];
        field = "";
      } else if (ch === "\r") {
        // skip
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || current.length > 0) {
    current.push(field);
    rows.push(current);
  }
  return rows;
}

function parseJson(text: string): Record<string, unknown>[] {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error("JSON must be an array of question objects");
  return data as Record<string, unknown>[];
}

function validateRow(
  row: Record<string, string>,
  rowNumber: number,
): ParsedRow {
  const errors: string[] = [];
  const get = (k: string) => (row[k] ?? "").trim();

  const chapterId = parseInt(get("chapter_id"), 10);
  const type = get("type").toUpperCase();
  const difficulty = get("difficulty").toUpperCase();
  const statement = get("statement_tex");
  const licence = get("licence").toUpperCase() || "UNKNOWN";
  const sourceReference = get("source_reference") || null;

  if (!statement) errors.push("Missing statement_tex");
  if (!chapterId || isNaN(chapterId)) errors.push("Missing or invalid chapter_id");
  if (!VALID_TYPES.includes(type)) errors.push(`Invalid type: ${type}`);
  if (!VALID_DIFFICULTIES.includes(difficulty)) errors.push(`Invalid difficulty: ${difficulty}`);
  if (!VALID_LICENCES.includes(licence)) errors.push(`Invalid licence: ${licence}`);

  let options_json: { id: string; text: string }[] | null = null;
  let answer_json: { option?: string; value?: number } | null = null;
  let tolerance = 0;

  if (type === "MCQ") {
    const opts = [
      { id: "a", text: get("option_a") },
      { id: "b", text: get("option_b") },
      { id: "c", text: get("option_c") },
      { id: "d", text: get("option_d") },
    ].filter((o) => o.text);
    options_json = opts.length >= 2 ? opts : null;
    if (!options_json) errors.push("MCQ needs at least 2 options");

    const answerOpt = get("answer_option").toLowerCase();
    if (answerOpt && ["a", "b", "c", "d"].includes(answerOpt)) {
      answer_json = { option: answerOpt };
    } else {
      errors.push("MCQ needs valid answer_option (a/b/c/d)");
    }
  } else if (type === "NUMERICAL") {
    const answerVal = parseFloat(get("answer_value"));
    if (!isNaN(answerVal)) {
      answer_json = { value: answerVal };
    } else {
      errors.push("NUMERICAL needs valid answer_value");
    }
    const tol = parseFloat(get("tolerance"));
    tolerance = isNaN(tol) ? 0 : tol;
  }

  return {
    chapter_id: chapterId || 0,
    type: type || "MCQ",
    difficulty: difficulty || "MEDIUM",
    statement_tex: statement,
    options_json,
    answer_json,
    tolerance,
    solution_tex: get("solution_tex") || null,
    licence: licence || "UNKNOWN",
    source_reference: sourceReference,
    errors,
    row_number: rowNumber,
  };
}

function jsonToRow(obj: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) {
      result[k] = "";
    } else if (typeof v === "object") {
      result[k] = JSON.stringify(v);
    } else {
      result[k] = String(v);
    }
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "ADMIN") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (profile.status === "SUSPENDED") {
      return new Response(JSON.stringify({ error: "Account suspended" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { file_content, file_name, content_type = "csv", dry_run = false } = body as {
      file_content: string;
      file_name: string;
      content_type?: "csv" | "json";
      dry_run?: boolean;
    };

    if (!file_content || !file_name) {
      return new Response(JSON.stringify({ error: "Missing file_content or file_name" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (file_content.length > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: `File too large (max 5MB)` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let rawRows: Record<string, string>[] = [];

    if (content_type === "json") {
      const arr = parseJson(file_content);
      if (arr.length > MAX_ROWS) {
        return new Response(JSON.stringify({ error: `Too many rows (max ${MAX_ROWS})` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      rawRows = arr.map(jsonToRow);
    } else {
      const csvRows = parseCsv(file_content);
      if (csvRows.length < 2) {
        return new Response(JSON.stringify({ error: "CSV must have a header and at least one row" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const headers = csvRows[0].map((h) => h.trim().toLowerCase());
      const dataRows = csvRows.slice(1).filter((r) => r.some((c) => c.trim() !== ""));
      if (dataRows.length > MAX_ROWS) {
        return new Response(JSON.stringify({ error: `Too many rows (max ${MAX_ROWS})` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      rawRows = dataRows.map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h] = row[i] ?? "";
        });
        return obj;
      });
    }

    const parsed: ParsedRow[] = rawRows.map((r, i) => validateRow(r, i + 2));

    // Validate chapter IDs and translate older 1-based template IDs to current database IDs.
    const { data: chapterRows } = await serviceClient.from("chapters").select("id").order("id");
    const chapterList = chapterRows ?? [];
    const validChapterIds = new Set(chapterList.map((chapter) => chapter.id));
    const legacyChapterIds = new Map(chapterList.map((chapter, index) => [index + 1, chapter.id]));

    for (const row of parsed) {
      const mappedChapterId = legacyChapterIds.get(row.chapter_id);
      if (!validChapterIds.has(row.chapter_id) && mappedChapterId) {
        row.chapter_id = mappedChapterId;
      } else if (row.chapter_id && !validChapterIds.has(row.chapter_id) && !row.errors.some((e) => e.includes("chapter_id"))) {
        row.errors.push(`Chapter ID ${row.chapter_id} does not exist`);
      }
    }

    const valid = parsed.filter((r) => r.errors.length === 0);
    const invalid = parsed.filter((r) => r.errors.length > 0);

    if (dry_run) {
      return new Response(JSON.stringify({
        dry_run: true,
        total: parsed.length,
        valid: valid.length,
        invalid: invalid.length,
        errors: invalid.map((r) => ({
          row: r.row_number,
          statement: r.statement_tex.slice(0, 100),
          errors: r.errors,
        })),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create import batch
    const { data: batch, error: batchError } = await serviceClient
      .from("import_batches")
      .insert({
        created_by: user.id,
        file_name,
        rows_total: parsed.length,
        rows_ok: 0,
        rows_failed: 0,
        status: "PENDING",
      })
      .select("id")
      .single();

    if (batchError || !batch) {
      return new Response(JSON.stringify({ error: "Failed to create import batch" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let okCount = 0;
    let failCount = 0;

    for (const row of valid) {
      const { error: insertError } = await serviceClient.from("questions").insert({
        chapter_id: row.chapter_id,
        type: row.type,
        difficulty: row.difficulty,
        statement_tex: row.statement_tex,
        options_json: row.options_json,
        answer_json: row.answer_json,
        tolerance: row.tolerance,
        solution_tex: row.solution_tex,
        review_status: "DRAFT",
        source: "IMPORTED",
        created_by: user.id,
        licence: row.licence,
        source_reference: row.source_reference,
      });
      if (insertError) {
        failCount++;
      } else {
        okCount++;
      }
    }
    failCount += invalid.length;

    const batchStatus = failCount === 0 ? "COMPLETED" : okCount === 0 ? "ROLLED_BACK" : "PARTIAL";
    await serviceClient
      .from("import_batches")
      .update({
        rows_ok: okCount,
        rows_failed: failCount,
        status: batchStatus,
      })
      .eq("id", batch.id);

    return new Response(JSON.stringify({
      success: true,
      batch_id: batch.id,
      total: parsed.length,
      valid: valid.length,
      invalid: invalid.length,
      imported: okCount,
      failed: failCount,
      errors: invalid.map((r) => ({
        row: r.row_number,
        statement: r.statement_tex.slice(0, 100),
        errors: r.errors,
      })),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
