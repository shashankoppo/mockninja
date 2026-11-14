export type QuestionState = 'NOT_VISITED' | 'NOT_ANSWERED' | 'ANSWERED' | 'MARKED' | 'ANSWERED_MARKED';

export type PaletteStatus = 'not-visited' | 'not-answered' | 'answered' | 'marked' | 'answered-marked';

export const QUESTION_STATES: Record<QuestionState, {
  palette: PaletteStatus;
  label: string;
  legend: string;
  shape: string;
  color: string;
  bgColor: string;
  textColor: string;
  evaluated: boolean;
}> = {
  NOT_VISITED: {
    palette: 'not-visited',
    label: 'Not Visited',
    legend: 'Has not been viewed yet',
    shape: 'rounded-md',
    color: '#9E9E9E',
    bgColor: 'bg-white',
    textColor: 'text-[#616161]',
    evaluated: false,
  },
  NOT_ANSWERED: {
    palette: 'not-answered',
    label: 'Not Answered',
    legend: 'Visited but no answer saved',
    shape: 'rounded-t-md rounded-b-lg',
    color: '#E53935',
    bgColor: 'bg-[#E53935]',
    textColor: 'text-white',
    evaluated: false,
  },
  ANSWERED: {
    palette: 'answered',
    label: 'Answered',
    legend: 'Answer saved and will be evaluated',
    shape: 'rounded-t-lg rounded-b-md',
    color: '#4CAF50',
    bgColor: 'bg-[#4CAF50]',
    textColor: 'text-white',
    evaluated: true,
  },
  MARKED: {
    palette: 'marked',
    label: 'Marked for Review',
    legend: 'Flagged for review, no answer saved',
    shape: 'rounded-full',
    color: '#7B1FA2',
    bgColor: 'bg-[#7B1FA2]',
    textColor: 'text-white',
    evaluated: false,
  },
  ANSWERED_MARKED: {
    palette: 'answered-marked',
    label: 'Answered & Marked for Review',
    legend: 'Answer saved and flagged for review; will be evaluated',
    shape: 'rounded-full',
    color: '#7B1FA2',
    bgColor: 'bg-[#7B1FA2]',
    textColor: 'text-white',
    evaluated: true,
  },
};

export const STATE_ORDER: QuestionState[] = ['NOT_VISITED', 'NOT_ANSWERED', 'ANSWERED', 'MARKED', 'ANSWERED_MARKED'];

export function toPaletteStatus(state: QuestionState): PaletteStatus {
  return QUESTION_STATES[state].palette;
}

export function isEvaluated(state: QuestionState): boolean {
  return QUESTION_STATES[state].evaluated;
}

/** Derive the question state from a saved answer record. */
export function deriveState(params: {
  visited: boolean;
  hasAnswer: boolean;
  flagged: boolean;
}): QuestionState {
  const { visited, hasAnswer, flagged } = params;
  if (!visited) return 'NOT_VISITED';
  if (flagged && hasAnswer) return 'ANSWERED_MARKED';
  if (flagged) return 'MARKED';
  if (hasAnswer) return 'ANSWERED';
  return 'NOT_ANSWERED';
}
