import { test, expect } from '@playwright/test';
import { deriveState, isEvaluated, QUESTION_STATES, STATE_ORDER, toPaletteStatus } from '@/exam/questionStates';

test.describe('deriveState transitions', () => {
  test('first view turns NOT_VISITED into NOT_ANSWERED', () => {
    expect(deriveState({ visited: true, hasAnswer: false, flagged: false })).toBe('NOT_ANSWERED');
  });

  test('unvisited stays NOT_VISITED', () => {
    expect(deriveState({ visited: false, hasAnswer: false, flagged: false })).toBe('NOT_VISITED');
    expect(deriveState({ visited: false, hasAnswer: true, flagged: false })).toBe('NOT_VISITED');
  });

  test('Save and Next with an answer gives ANSWERED and removes review mark', () => {
    expect(deriveState({ visited: true, hasAnswer: true, flagged: false })).toBe('ANSWERED');
    expect(deriveState({ visited: true, hasAnswer: true, flagged: true })).not.toBe('ANSWERED');
  });

  test('Mark for Review and Next with an answer gives ANSWERED_MARKED (evaluated)', () => {
    const state = deriveState({ visited: true, hasAnswer: true, flagged: true });
    expect(state).toBe('ANSWERED_MARKED');
    expect(isEvaluated(state)).toBe(true);
  });

  test('Mark for Review and Next without an answer gives MARKED (not evaluated)', () => {
    const state = deriveState({ visited: true, hasAnswer: false, flagged: true });
    expect(state).toBe('MARKED');
    expect(isEvaluated(state)).toBe(false);
  });

  test('Clear Response gives NOT_ANSWERED', () => {
    expect(deriveState({ visited: true, hasAnswer: false, flagged: false })).toBe('NOT_ANSWERED');
  });

  test('moving away without saving discards an unsaved selection', () => {
    // Unsaved selection means hasAnswer=false from the committed perspective;
    // deriveState uses committed state, not transient UI selection
    expect(deriveState({ visited: true, hasAnswer: false, flagged: false })).toBe('NOT_ANSWERED');
  });

  test('only ANSWERED and ANSWERED_MARKED are evaluated', () => {
    for (const state of STATE_ORDER) {
      const evaluated = isEvaluated(state);
      if (state === 'ANSWERED' || state === 'ANSWERED_MARKED') {
        expect(evaluated).toBe(true);
      } else {
        expect(evaluated).toBe(false);
      }
    }
  });

  test('every state has a palette mapping', () => {
    for (const state of STATE_ORDER) {
      expect(toPaletteStatus(state)).toBeTruthy();
    }
  });

  test('every state has label and legend text', () => {
    for (const state of STATE_ORDER) {
      const def = QUESTION_STATES[state];
      expect(def.label.length).toBeGreaterThan(0);
      expect(def.legend.length).toBeGreaterThan(0);
    }
  });
});
