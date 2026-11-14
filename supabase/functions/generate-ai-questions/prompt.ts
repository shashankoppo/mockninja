export interface GeneratedQuestion {
  statement_tex: string;
  options?: { id: string; text: string }[];
  correct_option?: string;
  correct_value?: number;
  tolerance?: number;
  solution_tex: string;
}

export function buildPrompt(subject: string, chapter: string, type: string, difficulty: string, count: number) {
  const shape = type === "MCQ"
    ? `Each item: {"statement_tex": string, "options": [{"id":"a","text":string},{"id":"b",...},{"id":"c",...},{"id":"d",...}], "correct_option": "a"|"b"|"c"|"d", "solution_tex": string}`
    : `Each item: {"statement_tex": string, "correct_value": number, "tolerance": number, "solution_tex": string}`;
  return [
    `You write JEE Main style practice questions.`,
    `Subject: ${subject}. Chapter: ${chapter}. Question type: ${type}. Difficulty: ${difficulty}.`,
    `Write exactly ${count} original questions. Use LaTeX inside $...$ for maths.`,
    shape,
    `Return only a JSON array of items in that shape, with no prose.`,
  ].join("\n");
}

export function isValidQuestion(q: GeneratedQuestion, type: string): boolean {
  if (typeof q.statement_tex !== "string" || q.statement_tex.trim().length < 10) return false;
  if (typeof q.solution_tex !== "string" || q.solution_tex.trim().length < 3) return false;
  if (type === "MCQ") {
    if (!Array.isArray(q.options) || q.options.length !== 4) return false;
    const ids = q.options.map((o) => o.id);
    if (new Set(ids).size !== 4) return false;
    return q.options.every((o) => typeof o.text === "string" && o.text.trim().length > 0) &&
      typeof q.correct_option === "string" && ids.includes(q.correct_option);
  }
  return typeof q.correct_value === "number" && Number.isFinite(q.correct_value) &&
    typeof q.tolerance === "number" && q.tolerance >= 0;
}
