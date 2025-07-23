-- Add a 'source' column to the words table to track the origin of the word.
-- We set a default value 'default' for all existing words.
ALTER TABLE words ADD COLUMN source VARCHAR(50) NOT NULL DEFAULT 'default';

-- Update the unique constraint to be on the combination of lemma and source,
-- allowing the same word from different vocabulary books.
ALTER TABLE words DROP CONSTRAINT words_lemma_key;
ALTER TABLE words ADD CONSTRAINT words_lemma_source_key UNIQUE (lemma, source);

-- Add an index on the source column to speed up queries that filter by source.
CREATE INDEX idx_words_source ON words(source); 