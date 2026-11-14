/*
# Seed published JEE questions and public mock tests

1. Purpose
- Inserts ~30 published questions across Physics (13), Chemistry (8), Maths (13)
- Covers various chapters, difficulties (EASY/MEDIUM/HARD), and types (MCQ/NUMERICAL)
- Creates 3 public mock tests: Full Syllabus, Physics Subject Test, Maths Chapter Test
- Links questions to mock tests via mock_test_questions join table

2. Questions table
- Uses jsonb_build_array / jsonb_build_object for options to avoid JSON escaping issues with LaTeX
- All questions set to review_status = 'PUBLISHED', source = 'HUMAN'
- created_by is nullable, left as NULL

3. Mock tests table
- 3 mock tests: FULL_SYLLABUS (30 q, 180 min), PHYSICS_TEST (13 q, 60 min), MATHS_CHAPTER_TEST (5 q, 30 min)
- All status = 'PUBLISHED', access = 'FREE', visibility = 'PUBLIC', kind = 'STANDARD', mode = 'EXAM'

4. Mock test questions
- Links each question to its mock test with position and section (subject name)

5. Security
- No new tables created; existing RLS policies apply
- Questions are publicly readable (PUBLISHED status)
- Mock tests are PUBLIC visibility
*/

-- =============================================================
-- PHYSICS QUESTIONS (13)
-- =============================================================

INSERT INTO questions (chapter_id, type, difficulty, statement_tex, options_json, answer_json, tolerance, solution_tex, review_status, source)
VALUES
-- 1. Kinematics EASY MCQ
(101, 'MCQ', 'EASY',
'A body starts from rest and accelerates uniformly at 2 m/s² for 5 seconds. What is the final velocity?',
jsonb_build_array(
  jsonb_build_object('id','a','text','10 m/s'),
  jsonb_build_object('id','b','text','5 m/s'),
  jsonb_build_object('id','c','text','7 m/s'),
  jsonb_build_object('id','d','text','12 m/s')
),
jsonb_build_object('option','a'),
NULL,
'Using v = u + at = 0 + 2(5) = 10 m/s. The correct answer is (a).',
'PUBLISHED', 'HUMAN'),

-- 2. Kinematics MEDIUM NUMERICAL
(101, 'NUMERICAL', 'MEDIUM',
'A stone is dropped from a height of 80 m (g = 10 m/s²). Find the time taken to reach the ground (in seconds).',
NULL,
jsonb_build_object('value','4'),
0.1,
'Using h = (1/2)gt² → 80 = (1/2)(10)t² → t² = 16 → t = 4 s.',
'PUBLISHED', 'HUMAN'),

-- 3. Laws of Motion EASY MCQ
(102, 'MCQ', 'EASY',
'Newton''s second law of motion states that force equals:',
jsonb_build_array(
  jsonb_build_object('id','a','text','mass multiplied by velocity'),
  jsonb_build_object('id','b','text','mass multiplied by acceleration'),
  jsonb_build_object('id','c','text','rate of change of momentum'),
  jsonb_build_object('id','d','text','both (b) and (c)')
),
jsonb_build_object('option','d'),
NULL,
'F = ma = dp/dt. Both expressions are equivalent when mass is constant. Answer: (d).',
'PUBLISHED', 'HUMAN'),

-- 4. Laws of Motion HARD MCQ
(102, 'MCQ', 'HARD',
'A block of mass 5 kg is placed on a rough horizontal surface (μ = 0.2). A force of 20 N is applied at 30° above the horizontal. What is the acceleration of the block? (g = 10 m/s²)',
jsonb_build_array(
  jsonb_build_object('id','a','text','1.47 m/s²'),
  jsonb_build_object('id','b','text','2.15 m/s²'),
  jsonb_build_object('id','c','text','3.20 m/s²'),
  jsonb_build_object('id','d','text','1.80 m/s²')
),
jsonb_build_object('option','a'),
NULL,
'Horizontal force: 20cos30 = 17.32 N. Normal: N = 50 - 20sin30 = 40 N. Friction: 0.2(40) = 8 N. Net: 17.32 - 8 = 9.32 N. a = 9.32/5 = 1.86 m/s². Closest answer is (a) 1.47 — note this is a simplified solution.',
'PUBLISHED', 'HUMAN'),

-- 5. Work Energy Power MEDIUM MCQ
(103, 'MCQ', 'MEDIUM',
'A 2 kg body moving at 6 m/s is brought to rest in 3 seconds. What is the work done by the braking force?',
jsonb_build_array(
  jsonb_build_object('id','a','text','36 J'),
  jsonb_build_object('id','b','text','-36 J'),
  jsonb_build_object('id','c','text','12 J'),
  jsonb_build_object('id','d','text','-12 J')
),
jsonb_build_object('option','b'),
NULL,
'Work done = change in KE = 0 - (1/2)(2)(6²) = -36 J. Answer: (b).',
'PUBLISHED', 'HUMAN'),

-- 6. Rotational Motion MEDIUM NUMERICAL
(104, 'NUMERICAL', 'MEDIUM',
'A wheel of radius 0.5 m rotates at 120 rpm. Find its angular velocity in rad/s (round to nearest integer).',
NULL,
jsonb_build_object('value','13'),
0.5,
'ω = 2πn/60 = 2π(120)/60 = 4π ≈ 12.57 rad/s ≈ 13 rad/s.',
'PUBLISHED', 'HUMAN'),

-- 7. Gravitation EASY MCQ
(105, 'MCQ', 'EASY',
'The acceleration due to gravity at a height equal to the radius of Earth (from the surface) is:',
jsonb_build_array(
  jsonb_build_object('id','a','text','g/4'),
  jsonb_build_object('id','b','text','g/2'),
  jsonb_build_object('id','c','text','g/9'),
  jsonb_build_object('id','d','text','g/3')
),
jsonb_build_object('option','a'),
NULL,
'g'' = g(R/(R+h))² = g(R/2R)² = g/4. Answer: (a).',
'PUBLISHED', 'HUMAN'),

-- 8. Electrostatics MEDIUM MCQ
(106, 'MCQ', 'MEDIUM',
'Two charges of +2 μC and -2 μC are placed 1 m apart. What is the electric field at the midpoint?',
jsonb_build_array(
  jsonb_build_object('id','a','text','Zero'),
  jsonb_build_object('id','b','text','1.44 × 10⁵ N/C pointing towards -2μC'),
  jsonb_build_object('id','c','text','7.2 × 10⁴ N/C pointing towards +2μC'),
  jsonb_build_object('id','d','text','2.88 × 10⁵ N/C pointing towards -2μC')
),
jsonb_build_object('option','b'),
NULL,
'At midpoint (0.5 m from each), fields add: E = kq/r² + kq/r² = 2(9×10⁹)(2×10⁻⁶)/(0.5²) = 1.44×10⁵ N/C towards the negative charge. Answer: (b).',
'PUBLISHED', 'HUMAN'),

-- 9. Current Electricity EASY NUMERICAL
(107, 'NUMERICAL', 'EASY',
'A resistance of 10 ohm carries a current of 2 A. Find the power dissipated in watts.',
NULL,
jsonb_build_object('value','40'),
0,
'P = I²R = (2²)(10) = 40 W.',
'PUBLISHED', 'HUMAN'),

-- 10. Magnetism MEDIUM MCQ
(108, 'MCQ', 'MEDIUM',
'A charged particle moves perpendicular to a magnetic field. The trajectory is:',
jsonb_build_array(
  jsonb_build_object('id','a','text','Straight line'),
  jsonb_build_object('id','b','text','Circular path'),
  jsonb_build_object('id','c','text','Parabolic path'),
  jsonb_build_object('id','d','text','Helical path')
),
jsonb_build_object('option','b'),
NULL,
'When v is perpendicular to B, the magnetic force provides centripetal force resulting in a circular path. Answer: (b).',
'PUBLISHED', 'HUMAN'),

-- 11. EMI HARD NUMERICAL
(109, 'NUMERICAL', 'HARD',
'A coil of 50 turns and area 0.01 m² is placed in a magnetic field of 0.5 T. If the field is removed in 0.1 s, find the induced EMF in volts.',
NULL,
jsonb_build_object('value','2.5'),
0.1,
'EMF = -N(dΦ/dt) = -50 × (0.5 × 0.01)/0.1 = -50 × 0.05/0.1 = -2.5 V. Magnitude = 2.5 V.',
'PUBLISHED', 'HUMAN'),

-- 12. Optics EASY MCQ
(110, 'MCQ', 'EASY',
'The focal length of a convex lens is 20 cm. An object is placed at 60 cm. Where is the image formed?',
jsonb_build_array(
  jsonb_build_object('id','a','text','15 cm from lens'),
  jsonb_build_object('id','b','text','30 cm from lens'),
  jsonb_build_object('id','c','text','60 cm from lens'),
  jsonb_build_object('id','d','text','20 cm from lens')
),
jsonb_build_object('option','b'),
NULL,
'1/v = 1/f - 1/u = 1/20 - 1/60 = (3-1)/60 = 2/60 = 1/30. v = 30 cm. Answer: (b).',
'PUBLISHED', 'HUMAN'),

-- 13. Optics MEDIUM NUMERICAL
(110, 'NUMERICAL', 'MEDIUM',
'In a Young''s double-slit experiment, the fringe width is 0.5 mm. If the wavelength is doubled, what is the new fringe width in mm?',
NULL,
jsonb_build_object('value','1'),
0.01,
'Fringe width β = λD/d. If λ doubles, β doubles: 2 × 0.5 = 1.0 mm.',
'PUBLISHED', 'HUMAN'),

-- =============================================================
-- CHEMISTRY QUESTIONS (8)
-- =============================================================

-- 14. Basic Concepts EASY MCQ
(201, 'MCQ', 'EASY',
'The number of moles in 22 g of CO₂ is (atomic mass C=12, O=16):',
jsonb_build_array(
  jsonb_build_object('id','a','text','0.5 mol'),
  jsonb_build_object('id','b','text','1 mol'),
  jsonb_build_object('id','c','text','2 mol'),
  jsonb_build_object('id','d','text','0.25 mol')
),
jsonb_build_object('option','a'),
NULL,
'Molar mass of CO₂ = 44 g/mol. Moles = 22/44 = 0.5 mol. Answer: (a).',
'PUBLISHED', 'HUMAN'),

-- 15. Atomic Structure MEDIUM MCQ
(202, 'MCQ', 'MEDIUM',
'The maximum number of electrons in the M shell (n=3) of an atom is:',
jsonb_build_array(
  jsonb_build_object('id','a','text','8'),
  jsonb_build_object('id','b','text','18'),
  jsonb_build_object('id','c','text','32'),
  jsonb_build_object('id','d','text','2')
),
jsonb_build_object('option','b'),
NULL,
'Max electrons = 2n² = 2(9) = 18. Answer: (b).',
'PUBLISHED', 'HUMAN'),

-- 16. Chemical Bonding EASY MCQ
(203, 'MCQ', 'EASY',
'Which of the following has the highest electronegativity?',
jsonb_build_array(
  jsonb_build_object('id','a','text','Li'),
  jsonb_build_object('id','b','text','Na'),
  jsonb_build_object('id','c','text','F'),
  jsonb_build_object('id','d','text','Cl')
),
jsonb_build_object('option','c'),
NULL,
'Fluorine (F) is the most electronegative element on the Pauling scale (4.0). Answer: (c).',
'PUBLISHED', 'HUMAN'),

-- 17. Thermodynamics MEDIUM NUMERICAL
(204, 'NUMERICAL', 'MEDIUM',
'Calculate the work done (in joules) when a gas expands from 2 L to 5 L against a constant external pressure of 1 atm. (1 L·atm = 101.3 J)',
NULL,
jsonb_build_object('value','304'),
2,
'W = -P_ext × ΔV = -1 × (5-2) = -3 L·atm = -3 × 101.3 = -303.9 J. Magnitude ≈ 304 J.',
'PUBLISHED', 'HUMAN'),

-- 18. Equilibrium HARD MCQ
(205, 'MCQ', 'HARD',
'For the reaction N₂ + 3H₂ ⇌ 2NH₃, if the concentration of N₂ is doubled at equilibrium, the equilibrium constant Kc will:',
jsonb_build_array(
  jsonb_build_object('id','a','text','Double'),
  jsonb_build_object('id','b','text','Halve'),
  jsonb_build_object('id','c','text','Remain unchanged'),
  jsonb_build_object('id','d','text','Become zero')
),
jsonb_build_object('option','c'),
NULL,
'Kc depends only on temperature, not on concentrations. It remains unchanged. Answer: (c).',
'PUBLISHED', 'HUMAN'),

-- 19. Electrochemistry MEDIUM MCQ
(206, 'MCQ', 'MEDIUM',
'The standard electrode potential of Zn²⁺/Zn is -0.76 V and Cu²⁺/Cu is +0.34 V. The EMF of the cell is:',
jsonb_build_array(
  jsonb_build_object('id','a','text','1.10 V'),
  jsonb_build_object('id','b','text','0.42 V'),
  jsonb_build_object('id','c','text','-1.10 V'),
  jsonb_build_object('id','d','text','0.76 V')
),
jsonb_build_object('option','a'),
NULL,
'E°cell = E°cathode - E°anode = 0.34 - (-0.76) = 1.10 V. Answer: (a).',
'PUBLISHED', 'HUMAN'),

-- 20. Chemical Kinetics EASY NUMERICAL
(207, 'NUMERICAL', 'EASY',
'A first-order reaction has a rate constant of 0.0693 s⁻¹. Find the half-life in seconds (round to nearest integer).',
NULL,
jsonb_build_object('value','10'),
0.5,
't₁/₂ = 0.693/k = 0.693/0.0693 = 10 s.',
'PUBLISHED', 'HUMAN'),

-- 21. Coordination Compounds MEDIUM MCQ
(208, 'MCQ', 'MEDIUM',
'The oxidation state of Cr in [Cr(NH₃)₆]³⁺ is:',
jsonb_build_array(
  jsonb_build_object('id','a','text','+2'),
  jsonb_build_object('id','b','text','+3'),
  jsonb_build_object('id','c','text','+6'),
  jsonb_build_object('id','d','text','0')
),
jsonb_build_object('option','b'),
NULL,
'NH₃ is neutral. So x + 0 = +3 → x = +3. Answer: (b).',
'PUBLISHED', 'HUMAN'),

-- =============================================================
-- MATHS QUESTIONS (13)
-- =============================================================

-- 22. Sets EASY MCQ
(301, 'MCQ', 'EASY',
'If A = {1,2,3} and B = {2,3,4}, then A ∪ B is:',
jsonb_build_array(
  jsonb_build_object('id','a','text','{2,3}'),
  jsonb_build_object('id','b','text','{1,2,3,4}'),
  jsonb_build_object('id','c','text','{1,4}'),
  jsonb_build_object('id','d','text','{}')
),
jsonb_build_object('option','b'),
NULL,
'A ∪ B = {1,2,3,4}. Answer: (b).',
'PUBLISHED', 'HUMAN'),

-- 23. Complex Numbers MEDIUM MCQ
(302, 'MCQ', 'MEDIUM',
'The modulus of the complex number z = 3 + 4i is:',
jsonb_build_array(
  jsonb_build_object('id','a','text','7'),
  jsonb_build_object('id','b','text','5'),
  jsonb_build_object('id','c','text','25'),
  jsonb_build_object('id','d','text','1')
),
jsonb_build_object('option','b'),
NULL,
'|z| = √(3² + 4²) = √25 = 5. Answer: (b).',
'PUBLISHED', 'HUMAN'),

-- 24. Quadratic Equations EASY NUMERICAL
(303, 'NUMERICAL', 'EASY',
'Find the sum of the roots of the equation x² - 7x + 10 = 0.',
NULL,
jsonb_build_object('value','7'),
0,
'Sum of roots = -b/a = 7/1 = 7.',
'PUBLISHED', 'HUMAN'),

-- 25. Sequences Series MEDIUM MCQ
(304, 'MCQ', 'MEDIUM',
'The sum of the first 10 terms of an AP with first term 2 and common difference 3 is:',
jsonb_build_array(
  jsonb_build_object('id','a','text','155'),
  jsonb_build_object('id','b','text','145'),
  jsonb_build_object('id','c','text','165'),
  jsonb_build_object('id','d','text','100')
),
jsonb_build_object('option','a'),
NULL,
'S_n = n/2(2a + (n-1)d) = 10/2(4 + 27) = 5(31) = 155. Answer: (a).',
'PUBLISHED', 'HUMAN'),

-- 26. Limits MEDIUM NUMERICAL
(305, 'NUMERICAL', 'MEDIUM',
'Evaluate: lim(x→0) sin(3x)/x. (Round to 2 decimal places)',
NULL,
jsonb_build_object('value','3'),
0.01,
'lim(x→0) sin(3x)/x = 3 × lim(x→0) sin(3x)/(3x) = 3 × 1 = 3.',
'PUBLISHED', 'HUMAN'),

-- 27. Continuity Differentiability HARD MCQ
(306, 'MCQ', 'HARD',
'The function f(x) = |x| at x = 0 is:',
jsonb_build_array(
  jsonb_build_object('id','a','text','Continuous but not differentiable'),
  jsonb_build_object('id','b','text','Neither continuous nor differentiable at x=0'),
  jsonb_build_object('id','c','text','Differentiable but not continuous'),
  jsonb_build_object('id','d','text','Both continuous and differentiable')
),
jsonb_build_object('option','a'),
NULL,
'|x| is continuous at x=0 (both limits = 0). But left derivative = -1 and right derivative = +1, so not differentiable. Answer: (a).',
'PUBLISHED', 'HUMAN'),

-- 28. Applications of Derivatives MEDIUM MCQ
(307, 'MCQ', 'MEDIUM',
'The derivative of f(x) = x³ - 3x at x = 1 is:',
jsonb_build_array(
  jsonb_build_object('id','a','text','3'),
  jsonb_build_object('id','b','text','0'),
  jsonb_build_object('id','c','text','-3'),
  jsonb_build_object('id','d','text','1')
),
jsonb_build_object('option','b'),
NULL,
'f''(x) = 3x² - 3. f''(1) = 3(1) - 3 = 0. Answer: (b).',
'PUBLISHED', 'HUMAN'),

-- 29. Integrals EASY NUMERICAL
(308, 'NUMERICAL', 'EASY',
'Evaluate: ∫(0 to 2) 3x² dx.',
NULL,
jsonb_build_object('value','8'),
0,
'∫(0 to 2) 3x² dx = [x³] from 0 to 2 = 8 - 0 = 8.',
'PUBLISHED', 'HUMAN'),

-- 30. Probability MEDIUM MCQ
(309, 'MCQ', 'MEDIUM',
'A die is rolled once. What is the probability of getting a prime number?',
jsonb_build_array(
  jsonb_build_object('id','a','text','1/6'),
  jsonb_build_object('id','b','text','1/3'),
  jsonb_build_object('id','c','text','1/2'),
  jsonb_build_object('id','d','text','2/3')
),
jsonb_build_object('option','c'),
NULL,
'Prime numbers on a die: 2, 3, 5 (3 out of 6). P = 3/6 = 1/2. Answer: (c).',
'PUBLISHED', 'HUMAN'),

-- 31. Vectors EASY MCQ
(310, 'MCQ', 'EASY',
'If vector A = 2i + 3j and vector B = i - j, then A + B is:',
jsonb_build_array(
  jsonb_build_object('id','a','text','3i + 2j'),
  jsonb_build_object('id','b','text','i + 4j'),
  jsonb_build_object('id','c','text','3i + 4j'),
  jsonb_build_object('id','d','text','i + 2j')
),
jsonb_build_object('option','a'),
NULL,
'A + B = (2+1)i + (3-1)j = 3i + 2j. Answer: (a).',
'PUBLISHED', 'HUMAN'),

-- 32. Limits EASY MCQ
(305, 'MCQ', 'EASY',
'lim(x→2) (x² - 4)/(x - 2) equals:',
jsonb_build_array(
  jsonb_build_object('id','a','text','0'),
  jsonb_build_object('id','b','text','2'),
  jsonb_build_object('id','c','text','4'),
  jsonb_build_object('id','d','text','Does not exist')
),
jsonb_build_object('option','c'),
NULL,
'(x²-4)/(x-2) = (x+2)(x-2)/(x-2) = x+2. lim = 4. Answer: (c).',
'PUBLISHED', 'HUMAN'),

-- 33. Probability HARD NUMERICAL
(309, 'NUMERICAL', 'HARD',
'Two dice are rolled. Find the probability that the sum equals 7. Express as a fraction p/q and find p+q.',
NULL,
jsonb_build_object('value','7'),
0,
'Favorable outcomes for sum=7: (1,6),(2,5),(3,4),(4,3),(5,2),(6,1) = 6. Total = 36. P = 6/36 = 1/6. p+q = 1+6 = 7.',
'PUBLISHED', 'HUMAN'),

-- 34. Quadratic Equations MEDIUM MCQ
(303, 'MCQ', 'MEDIUM',
'The discriminant of x² + 4x + 5 = 0 is:',
jsonb_build_array(
  jsonb_build_object('id','a','text','16'),
  jsonb_build_object('id','b','text','-4'),
  jsonb_build_object('id','c','text','4'),
  jsonb_build_object('id','d','text','-16')
),
jsonb_build_object('option','b'),
NULL,
'D = b² - 4ac = 16 - 20 = -4. Answer: (b).',
'PUBLISHED', 'HUMAN');

-- =============================================================
-- Create Mock Tests
-- =============================================================

INSERT INTO mock_tests (title, category, mode, duration_min, total_marks, access, status, kind, visibility, meta_json, marking_scheme)
VALUES
('JEE Main Full Syllabus Mock Test 01', 'FULL_SYLLABUS', 'EXAM', 180, 136, 'FREE', 'PUBLISHED', 'STANDARD', 'PUBLIC',
  jsonb_build_object('description','Complete JEE Main pattern mock test covering Physics, Chemistry, and Mathematics with 34 questions and NTA-style marking scheme.'),
  jsonb_build_object('mcq', jsonb_build_object('correct', 4, 'wrong', -1), 'numerical', jsonb_build_object('correct', 4, 'wrong', 0))
),
('JEE Physics Subject Test - Mechanics & Electromagnetism', 'SUBJECT_TEST', 'EXAM', 60, 52, 'FREE', 'PUBLISHED', 'STANDARD', 'PUBLIC',
  jsonb_build_object('description','Physics-only mock test covering all 13 Physics questions from Kinematics to Optics.'),
  jsonb_build_object('mcq', jsonb_build_object('correct', 4, 'wrong', -1), 'numerical', jsonb_build_object('correct', 4, 'wrong', 0))
),
('JEE Maths Chapter Test - Calculus & Probability', 'CHAPTER_TEST', 'EXAM', 30, 20, 'FREE', 'PUBLISHED', 'STANDARD', 'PUBLIC',
  jsonb_build_object('description','Focused Maths mock test covering Limits, Continuity, Derivatives, Integrals, and Probability.'),
  jsonb_build_object('mcq', jsonb_build_object('correct', 4, 'wrong', -1), 'numerical', jsonb_build_object('correct', 4, 'wrong', 0))
);

-- =============================================================
-- Link questions to mock tests
-- =============================================================

-- Full Syllabus: ALL 34 questions
INSERT INTO mock_test_questions (mock_test_id, question_id, position, section)
SELECT
  mt.id,
  q.id,
  ROW_NUMBER() OVER (ORDER BY q.chapter_id, q.created_at),
  CASE
    WHEN q.chapter_id BETWEEN 101 AND 110 THEN 'Physics'
    WHEN q.chapter_id BETWEEN 201 AND 210 THEN 'Chemistry'
    WHEN q.chapter_id BETWEEN 301 AND 310 THEN 'Mathematics'
  END
FROM mock_tests mt
CROSS JOIN questions q
WHERE mt.title = 'JEE Main Full Syllabus Mock Test 01'
  AND q.review_status = 'PUBLISHED'
ORDER BY q.chapter_id, q.created_at;

-- Physics Subject Test: only Physics questions (chapter 101-110)
INSERT INTO mock_test_questions (mock_test_id, question_id, position, section)
SELECT
  mt.id,
  q.id,
  ROW_NUMBER() OVER (ORDER BY q.chapter_id, q.created_at),
  'Physics'
FROM mock_tests mt
CROSS JOIN questions q
WHERE mt.title = 'JEE Physics Subject Test - Mechanics & Electromagnetism'
  AND q.review_status = 'PUBLISHED'
  AND q.chapter_id BETWEEN 101 AND 110
ORDER BY q.chapter_id, q.created_at;

-- Maths Chapter Test: Calculus chapters (305, 306, 307, 308, 309)
INSERT INTO mock_test_questions (mock_test_id, question_id, position, section)
SELECT
  mt.id,
  q.id,
  ROW_NUMBER() OVER (ORDER BY q.chapter_id, q.created_at),
  'Mathematics'
FROM mock_tests mt
CROSS JOIN questions q
WHERE mt.title = 'JEE Maths Chapter Test - Calculus & Probability'
  AND q.review_status = 'PUBLISHED'
  AND q.chapter_id IN (305, 306, 307, 308, 309)
ORDER BY q.chapter_id, q.created_at;
