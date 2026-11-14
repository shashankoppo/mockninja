/*
# Seed subjects and chapters for JEE PCM

1. Purpose
- Populate subjects (Physics, Chemistry, Mathematics) and chapters with JEE standard topics.
- Class levels 11 and 12, with ordinal for display ordering.

2. Data
- 3 subjects, 30 chapters total (10 per subject, 5 class-11 + 5 class-12 each).
- All inserts are idempotent (ON CONFLICT DO NOTHING).

3. Security
- No new tables. No RLS changes. Subjects and chapters already have RLS + public SELECT policies.
*/

INSERT INTO subjects (id, name) VALUES
  (1, 'Physics'),
  (2, 'Chemistry'),
  (3, 'Mathematics')
ON CONFLICT (id) DO NOTHING;

INSERT INTO chapters (id, subject_id, name, class_level, ordinal) VALUES
  -- Physics Class 11
  (101, 1, 'Kinematics', 11, 1),
  (102, 1, 'Laws of Motion', 11, 2),
  (103, 1, 'Work, Energy and Power', 11, 3),
  (104, 1, 'Rotational Motion', 11, 4),
  (105, 1, 'Gravitation', 11, 5),
  -- Physics Class 12
  (106, 1, 'Electrostatics', 12, 1),
  (107, 1, 'Current Electricity', 12, 2),
  (108, 1, 'Magnetism', 12, 3),
  (109, 1, 'Electromagnetic Induction', 12, 4),
  (110, 1, 'Optics', 12, 5),
  -- Chemistry Class 11
  (201, 2, 'Some Basic Concepts of Chemistry', 11, 1),
  (202, 2, 'Atomic Structure', 11, 2),
  (203, 2, 'Chemical Bonding', 11, 3),
  (204, 2, 'Thermodynamics', 11, 4),
  (205, 2, 'Equilibrium', 11, 5),
  -- Chemistry Class 12
  (206, 2, 'Electrochemistry', 12, 1),
  (207, 2, 'Chemical Kinetics', 12, 2),
  (208, 2, 'Coordination Compounds', 12, 3),
  (209, 2, 'Haloalkanes and Haloarenes', 12, 4),
  (210, 2, 'Biomolecules', 12, 5),
  -- Mathematics Class 11
  (301, 3, 'Sets and Functions', 11, 1),
  (302, 3, 'Complex Numbers', 11, 2),
  (303, 3, 'Quadratic Equations', 11, 3),
  (304, 3, 'Sequences and Series', 11, 4),
  (305, 3, 'Limits and Derivatives', 11, 5),
  -- Mathematics Class 12
  (306, 3, 'Continuity and Differentiability', 12, 1),
  (307, 3, 'Applications of Derivatives', 12, 2),
  (308, 3, 'Integrals', 12, 3),
  (309, 3, 'Probability', 12, 4),
  (310, 3, 'Vectors', 12, 5)
ON CONFLICT (id) DO NOTHING;
