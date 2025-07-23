-- Add unit information to words. We are adding it to the meanings table
-- because a word can appear in different sources and different units.
ALTER TABLE meanings ADD COLUMN unit VARCHAR(255);

-- Create a table to store the user's daily word selection.
CREATE TABLE daily_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create a join table for the many-to-many relationship between daily_plans and meanings.
CREATE TABLE daily_plan_words (
    plan_id UUID NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
    meaning_id INT NOT NULL REFERENCES meanings(id) ON DELETE CASCADE,
    PRIMARY KEY (plan_id, meaning_id)
); 