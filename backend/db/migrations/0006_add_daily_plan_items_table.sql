-- Create the daily_plan_items table to link daily plans with specific meanings.
CREATE TABLE IF NOT EXISTS daily_plan_items (
    id SERIAL PRIMARY KEY,
    plan_id UUID NOT NULL,
    meaning_id INTEGER NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES daily_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (meaning_id) REFERENCES meanings(id) ON DELETE CASCADE,
    UNIQUE (plan_id, meaning_id)
); 