# NTA Fidelity Audit

> Compare MOCK NINJA exam environment against NTA's free practice test.
> Rows marked VERIFIED have been checked against the code. Rows marked UNKNOWN need comparison with the real NTA interface.

| Element | Our behaviour | Matches NTA | Notes |
|---|---|---|---|
| Welcome screen | Student name + avatar, test name, subjects, duration, question count, language dropdown, Next button | UNKNOWN | No fake ID photo; uses initials avatar |
| Instruction pages | 4 paged screens: timer, palette symbols, answering, navigation+marking, rules. Previous/Next navigation. | UNKNOWN | Content based on NTA wording from coaching sources. Palette symbols now rendered from the single shared source (questionStates.ts). |
| Declaration page | Checkbox "I have read and understood" + disabled begin button until ticked | UNKNOWN | |
| Header band | Test title left, candidate name+avatar right, large digital countdown | UNKNOWN | Amber in last 15 min, no blinking |
| Subject tabs | Physics, Chemistry, Mathematics as pill buttons | UNKNOWN | |
| Section tabs | Section A (MCQ) and Section B (Numerical) under active subject | UNKNOWN | |
| Question header strip | "Question No. N" left, marks correct/negative right, question type label | UNKNOWN | |
| Option labels | Numbered (1), (2), (3), (4) — not A, B, C, D | UNKNOWN | Internal ids remain stable |
| Numerical keypad | On-screen keypad: 0-9, decimal, minus, backspace, clear. Physical keyboard disabled in strict mode. Keys are focusable and operable with Enter/Space. Display is read-only with inputMode=none so no phone keyboard opens. Value announced via aria-live. | UNKNOWN | VERIFIED in code: all keys are native buttons, display has role=textbox aria-readonly aria-live=polite inputMode=none |
| Palette symbols — Not Visited | Light grey rounded square with number | UNKNOWN | VERIFIED: shape and colour from questionStates.ts |
| Palette symbols — Not Answered | Red shape, flat top, pointed bottom | UNKNOWN | VERIFIED: rounded-t-md rounded-b-lg, #E53935 |
| Palette symbols — Answered | Green shape, pointed top, flat bottom | UNKNOWN | VERIFIED: rounded-t-lg rounded-b-md, #4CAF50 |
| Palette symbols — Marked for Review | Purple circle with number | UNKNOWN | VERIFIED: rounded-full, #7B1FA2 |
| Palette symbols — Answered & Marked | Purple circle with green check mark | UNKNOWN | VERIFIED: rounded-full with green check badge |
| Palette — current question highlight | Dark outline ring | UNKNOWN | ring-2 ring-govt-600 |
| Button names and order | Left: Mark for Review & Next, Clear Response. Right: Previous, Next, Save & Next. | UNKNOWN | |
| Exam Summary table | Per subject: total, answered, not answered, marked, answered+marked, not visited | UNKNOWN | |
| Confirmation wording | "Are you sure you want to submit? You will not be able to change your answers." with No and Yes buttons | UNKNOWN | |
| Thank-you screen | "Your test has been submitted" + Continue button. No answers/marks shown. | UNKNOWN | |
| Time-up behaviour | "Time is up. Your test is being submitted" overlay + auto-submit | UNKNOWN | Also handled by server cron job |
| Footer disclaimer | "Independent practice platform. Not affiliated with NTA." on every screen | UNKNOWN | VERIFIED: present in PreStartFlow footer and exam screens |
| Question Paper button | Opens side panel listing all questions of current subject (statement only, no answers) | UNKNOWN | |
| Instructions button | Opens instruction overlay without stopping clock | UNKNOWN | |
| Fullscreen (EXAM mode) | Requested on begin, exit logged + notice shown | UNKNOWN | |
| No calculator | No calculator anywhere; "Use paper for rough work" shown | UNKNOWN | |
| No hints/answers during test | Correct answers and solutions never shown before submit | UNKNOWN | Server enforces via RPC |
| Single source of truth | Five question states defined once in src/exam/questionStates.ts, imported by PaletteSymbol, ExamPage, PreStartFlow, HeroSection, MockDetailPage, and LandingPage | VERIFIED | No duplicate palette definitions remain in component files |
| State transitions | deriveState() pure function tested: Save→ANSWERED, Mark+answer→ANSWERED_MARKED, Mark only→MARKED, Clear→NOT_ANSWERED, first view→NOT_ANSWERED, unvisited stays NOT_VISITED. Only ANSWERED and ANSWERED_MARKED are evaluated. | VERIFIED | 10 unit tests pass |
| Homepage exam preview | Non-interactive sample screen with real palette symbols, keypad, and a text legend with one-line meanings. Caption: "Independent practice platform. Not affiliated with NTA." | VERIFIED | Decorative for screen readers (aria-hidden on preview), legend is real text |
