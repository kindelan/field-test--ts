-- Setup script for dynamic questions table and JSONB answers column

-- 1. Add answers column to test_ride_feedback
ALTER TABLE public.test_ride_feedback
ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}'::jsonb NOT NULL;

-- 2. Create review_questions table
DROP TABLE IF EXISTS public.review_questions CASCADE;

CREATE TABLE public.review_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_test_ids UUID[] DEFAULT NULL, -- NULL if common to all field tests, otherwise array of field test UUIDs
    section VARCHAR(50) NOT NULL, -- e.g. 'telemetry', 'motor_feel', 'terrain'
    label TEXT NOT NULL, -- The question displayed to the user
    question_key VARCHAR(100) NOT NULL UNIQUE, -- Key used to store in JSONB (e.g. 'initial_battery')
    input_type VARCHAR(50) NOT NULL, -- 'text', 'number', 'textarea', 'radio'
    options JSONB DEFAULT NULL, -- Array of options, e.g. ["Smooth", "Intermediate", "Harsh"]
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    parent_question_key VARCHAR(100) DEFAULT NULL, -- Key of the parent question for conditional display
    parent_trigger_value VARCHAR(100) DEFAULT NULL, -- Value of parent question that triggers display
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create GIN index on field_test_ids for containment querying
CREATE INDEX IF NOT EXISTS idx_review_questions_field_test_ids ON public.review_questions USING gin (field_test_ids);

-- Enable RLS on review_questions
ALTER TABLE public.review_questions ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for review_questions
-- Anyone authenticated (riders and admins) can select questions
CREATE POLICY select_review_questions_policy ON public.review_questions
    FOR SELECT TO authenticated USING (true);

-- Only admins can insert/update/delete questions
-- Since is_admin() helper might already be in the database, we can check if it exists or use standard policy checking for admin table.
-- Let's check how other tables define admin access. Usually they check against app_admins table or a custom function.
-- Let's create policy that checks if auth.email() exists in app_admins.
CREATE POLICY insert_review_questions_policy ON public.review_questions
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins WHERE email = auth.email()));

CREATE POLICY update_review_questions_policy ON public.review_questions
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.app_admins WHERE email = auth.email()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins WHERE email = auth.email()));

CREATE POLICY delete_review_questions_policy ON public.review_questions
    FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.app_admins WHERE email = auth.email()));

-- 4. Seed default questions
-- Clear out to avoid duplicate key errors on rerun
DELETE FROM public.review_questions WHERE question_key IN (
    'initial_battery', 'final_battery',
    'motor_startup', 'motor_stop', 'assistance',
    'power_feeling', 'motor_feel', 'motor_error', 'error_description',
    'comments', 'use_app', 'app_experience',
    'test_dynamic_mode', 'auto_mode_experience',
    'flat_terrain_assistance', 'flat_terrain_perception',
    'moderate_terrain_assistance', 'moderate_terrain_perception',
    'steep_terrain_assistance', 'steep_terrain_perception',
    'technical_terrain_assistance', 'technical_terrain_perception',
    'suggested_improvements'
);

INSERT INTO public.review_questions 
(section, label, question_key, input_type, options, is_required, sort_order, parent_question_key, parent_trigger_value)
VALUES
-- Telemetry/Battery section
('telemetry', 'Initial Battery (%)', 'initial_battery', 'number', NULL, TRUE, 10, NULL, NULL),
('telemetry', 'Final Battery (%)', 'final_battery', 'number', NULL, TRUE, 20, NULL, NULL),

-- Motor Feel section
('motor_feel', 'Motor Start Up', 'motor_startup', 'radio', '["Smooth", "Intermediate", "Harsh", "Other"]'::jsonb, TRUE, 30, NULL, NULL),
('motor_feel', 'Motor Stop', 'motor_stop', 'radio', '["Smooth", "Intermediate", "Harsh", "Other"]'::jsonb, TRUE, 40, NULL, NULL),
('motor_feel', 'Assistance', 'assistance', 'radio', '["Smooth", "Intermediate", "Harsh"]'::jsonb, TRUE, 50, NULL, NULL),
('motor_feel', 'Power Feeling', 'power_feeling', 'text', NULL, TRUE, 60, NULL, NULL),
('motor_feel', 'Motor Feel / Noise', 'motor_feel', 'text', NULL, TRUE, 70, NULL, NULL),
('motor_feel', 'Motor Error?', 'motor_error', 'radio', '["Yes", "No"]'::jsonb, TRUE, 80, NULL, NULL),
('motor_feel', 'Error Description', 'error_description', 'text', NULL, FALSE, 90, 'motor_error', 'Yes'),
('motor_feel', 'General Comments / Opinion', 'comments', 'text', NULL, TRUE, 100, NULL, NULL),
('motor_feel', 'Did you use the bike APP?', 'use_app', 'radio', '["Yes", "No"]'::jsonb, TRUE, 110, NULL, NULL),
('motor_feel', 'Comment your experience with APP', 'app_experience', 'text', NULL, FALSE, 120, 'use_app', 'Yes'),

-- Terrain / Dynamic mode section
('terrain', 'Are you testing the dynamic mode?', 'test_dynamic_mode', 'radio', '["Yes", "No"]'::jsonb, TRUE, 130, NULL, NULL),
('terrain', 'General experience with AUTO mode', 'auto_mode_experience', 'textarea', NULL, FALSE, 140, 'test_dynamic_mode', 'Yes'),

('terrain', 'Flat Terrain (Assistance)', 'flat_terrain_assistance', 'radio', '["Too much assistance", "Not enough assistance", "Appropriate assistance", "Other"]'::jsonb, FALSE, 150, 'test_dynamic_mode', 'Yes'),
('terrain', 'Explain your perception (Flat Terrain)', 'flat_terrain_perception', 'textarea', NULL, FALSE, 160, 'test_dynamic_mode', 'Yes'),

('terrain', 'Moderate Terrain / Rolling Terrain (Assistance)', 'moderate_terrain_assistance', 'radio', '["Too much assistance", "Not enough assistance", "Appropriate assistance", "Other"]'::jsonb, FALSE, 170, 'test_dynamic_mode', 'Yes'),
('terrain', 'Explain your perception (Moderate Terrain)', 'moderate_terrain_perception', 'textarea', NULL, FALSE, 180, 'test_dynamic_mode', 'Yes'),

('terrain', 'Steep Terrain / Climbing (Assistance)', 'steep_terrain_assistance', 'radio', '["Too much assistance", "Not enough assistance", "Appropriate assistance", "Other"]'::jsonb, FALSE, 190, 'test_dynamic_mode', 'Yes'),
('terrain', 'Explain your perception (Steep Terrain)', 'steep_terrain_perception', 'textarea', NULL, FALSE, 200, 'test_dynamic_mode', 'Yes'),

('terrain', 'Technical Terrain (Assistance)', 'technical_terrain_assistance', 'radio', '["Too much assistance", "Not enough assistance", "Appropriate assistance", "Other"]'::jsonb, FALSE, 210, 'test_dynamic_mode', 'Yes'),
('terrain', 'Explain your perception (Technical Terrain)', 'technical_terrain_perception', 'textarea', NULL, FALSE, 220, 'test_dynamic_mode', 'Yes'),

('terrain', 'Suggested Improvements', 'suggested_improvements', 'textarea', NULL, FALSE, 230, 'test_dynamic_mode', 'Yes');
