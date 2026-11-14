export interface ParsedQuestion {
  chapter_id: number;
  type: 'MCQ' | 'NUMERICAL';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  statement_tex: string;
  options_json: { id: string; text: string }[] | null;
  answer_json: { option?: string; value?: number } | null;
  tolerance: number;
  solution_tex: string | null;
  licence: string;
  source_reference: string | null;
  errors: string[];
}

export const QUESTION_CSV_TEMPLATE = `chapter_id,type,difficulty,statement_tex,option_a,option_b,option_c,option_d,answer_option,answer_value,tolerance,solution_tex,licence,source_reference
101,MCQ,EASY,"A body is thrown vertically upward with velocity $v$. Maximum height?","$v^2/2g$","$v^2/g$","$2v^2/g$","$v/2g$",A,,,,"Using $v^2 = u^2 - 2gh$ at max height $v=0$, $h = v^2/2g$",OWNED,
101,NUMERICAL,MEDIUM,"Find the magnitude of force on a 2kg mass with acceleration $5 m/s^2$.",,,,,,10,0.5,"$F = ma = 2 \\times 5 = 10$ N",OWNED,
101,MCQ,HARD,"The dimensional formula for impulse is?","$[MLT^{-1}]$","$[ML^2T^{-1}]$","$[MLT^{-2}]$","$[M^2LT^{-1}]$",A,,,,"Impulse = Force x Time = $[MLT^{-1}][T] = [MLT^{-1}]$",PUBLIC_DOMAIN,NCERT`;

const VALID_LICENCES = ['OWNED', 'LICENSED', 'PUBLIC_DOMAIN', 'UNKNOWN'];

function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r') {
        // Skip — handle \n
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

export function parseQuestionCsv(text: string): ParsedQuestion[] {
  const rows = parseCsvText(text);
  if (rows.length < 2) throw new Error('CSV must have a header row and at least one data row');

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const questions: ParsedQuestion[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3) continue;
    if (row.every((c) => c.trim() === '')) continue;

    const get = (key: string) => {
      const idx = headers.indexOf(key);
      return idx >= 0 ? (row[idx] || '').trim() : '';
    };

    const errors: string[] = [];
    const chapterId = parseInt(get('chapter_id'));
    const type = (get('type').toUpperCase() as 'MCQ' | 'NUMERICAL') || 'MCQ';
    const difficulty = (get('difficulty').toUpperCase() as 'EASY' | 'MEDIUM' | 'HARD') || 'MEDIUM';
    const statement = get('statement_tex');

    if (!statement) errors.push('Missing statement_tex');
    if (!chapterId || isNaN(chapterId)) errors.push('Missing or invalid chapter_id');
    if (!['MCQ', 'NUMERICAL'].includes(type)) errors.push(`Invalid type: ${type}`);
    if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) errors.push(`Invalid difficulty: ${difficulty}`);

    let options_json: { id: string; text: string }[] | null = null;
    let answer_json: { option?: string; value?: number } | null = null;
    let tolerance = 0;

    if (type === 'MCQ') {
      const opts = [
        { id: 'a', text: get('option_a') },
        { id: 'b', text: get('option_b') },
        { id: 'c', text: get('option_c') },
        { id: 'd', text: get('option_d') },
      ].filter((o) => o.text);
      options_json = opts.length >= 2 ? opts : null;
      if (!options_json) errors.push('MCQ needs at least 2 options');

      const answerOpt = get('answer_option').toLowerCase();
      if (answerOpt && ['a', 'b', 'c', 'd'].includes(answerOpt)) {
        answer_json = { option: answerOpt };
      } else {
        errors.push('MCQ needs valid answer_option (a/b/c/d)');
      }
    } else {
      const answerVal = parseFloat(get('answer_value'));
      if (!isNaN(answerVal)) {
        answer_json = { value: answerVal };
      } else {
        errors.push('NUMERICAL needs valid answer_value');
      }
      const tol = parseFloat(get('tolerance'));
      tolerance = isNaN(tol) ? 0 : tol;
    }

    const licenceRaw = get('licence').toUpperCase();
    const licence = VALID_LICENCES.includes(licenceRaw) ? licenceRaw : 'OWNED';
    const sourceReference = get('source_reference') || null;

    questions.push({
      chapter_id: chapterId || 0,
      type,
      difficulty: difficulty || 'MEDIUM',
      statement_tex: statement,
      options_json,
      answer_json,
      tolerance,
      solution_tex: get('solution_tex') || null,
      licence,
      source_reference: sourceReference,
      errors,
    });
  }

  return questions;
}
