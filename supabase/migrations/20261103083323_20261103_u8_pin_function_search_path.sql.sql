/*
# Pin search path on public helper functions

1. Changed Functions
- public_exam_categories, public_faqs, public_featured_tests(p_limit), public_homepage_content, public_platform_stats, public_testimonials
- generate_invoice_number, generate_referral_code, apply_referral_discount(p_code, p_amount)

2. What changes
- Each function now runs with search_path fixed to the public schema, so object names cannot be redirected by a caller's session settings.
- No logic, return values, or privileges change.

3. Security
- Clears the "function search path mutable" warnings from the database security check.
- Execute grants are untouched.
*/

ALTER FUNCTION public.public_exam_categories() SET search_path = public;
ALTER FUNCTION public.public_faqs() SET search_path = public;
ALTER FUNCTION public.public_featured_tests(integer) SET search_path = public;
ALTER FUNCTION public.public_homepage_content() SET search_path = public;
ALTER FUNCTION public.public_platform_stats() SET search_path = public;
ALTER FUNCTION public.public_testimonials() SET search_path = public;
ALTER FUNCTION public.generate_invoice_number() SET search_path = public;
ALTER FUNCTION public.generate_referral_code() SET search_path = public;
ALTER FUNCTION public.apply_referral_discount(text, integer) SET search_path = public;
