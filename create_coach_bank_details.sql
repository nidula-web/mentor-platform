-- Create coach_bank_details table
CREATE TABLE IF NOT EXISTS coach_bank_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL UNIQUE REFERENCES mentors(id) ON DELETE CASCADE,
    bank_name TEXT NOT NULL,
    other_bank_name TEXT,
    branch_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_holder_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE coach_bank_details ENABLE ROW LEVEL SECURITY;

-- Create policy: users can only manage their own bank details via their mentor_id
CREATE POLICY "Users can manage their own coach bank details" ON coach_bank_details
FOR ALL
USING (
    mentor_id IN (
        SELECT id FROM mentors WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    mentor_id IN (
        SELECT id FROM mentors WHERE user_id = auth.uid()
    )
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_coach_bank_details_updated_at
BEFORE UPDATE ON coach_bank_details
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
