import { supabase } from '@/lib/supabase';

export interface RevisionNote {
  id: string;
  title: string;
  body: string;
  ordinal: number;
  chapter: {
    id: number;
    name: string;
    class_level: number;
    subject: { id: number; name: string };
  };
}

export interface FormulaCard {
  id: string;
  front: string;
  back: string;
  hint: string | null;
  ordinal: number;
  subject: { id: number; name: string };
  chapter: { name: string } | null;
}

const NOTE_SELECT = 'id, title, body, ordinal, chapter:chapter_id(id, name, class_level, subject:subject_id(id, name))';
const CARD_SELECT = 'id, front, back, hint, ordinal, subject:subject_id(id, name), chapter:chapter_id(name)';

function isCompleteNote(row: Partial<RevisionNote>): row is RevisionNote {
  return Boolean(row.chapter?.subject);
}

function isCompleteCard(row: Partial<FormulaCard>): row is FormulaCard {
  return Boolean(row.subject);
}

export async function fetchHasPaidAccess(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_active_paid_plan', { p_user: userId });
  if (error) throw error;
  return data === true;
}

export async function fetchRevisionNotes(): Promise<RevisionNote[]> {
  const { data, error } = await supabase
    .from('revision_notes')
    .select(NOTE_SELECT)
    .eq('is_published', true)
    .order('ordinal');
  if (error) throw error;
  return ((data ?? []) as unknown as Partial<RevisionNote>[]).filter(isCompleteNote);
}

export async function fetchFormulaCards(): Promise<FormulaCard[]> {
  const { data, error } = await supabase
    .from('formula_cards')
    .select(CARD_SELECT)
    .eq('is_published', true)
    .order('ordinal');
  if (error) throw error;
  return ((data ?? []) as unknown as Partial<FormulaCard>[]).filter(isCompleteCard);
}
