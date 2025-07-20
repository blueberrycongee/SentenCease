-- Seed the words table
INSERT INTO words (lemma) VALUES
('run'),
('set'),
('go');

-- Seed the meanings table
-- Note: We assume the word IDs are 1 for 'run', 2 for 'set', 3 for 'go' based on insertion order.

-- Meanings for 'run' (word_id = 1)
INSERT INTO meanings (word_id, part_of_speech, definition, example_sentence) VALUES
(1, 'verb', 'to move at a speed faster than a walk, never having both or all the feet on the ground at the same time.', 'He can run a mile in under four minutes.'),
(1, 'verb', 'to be in charge of; manage.', 'She has been running a successful company for years.');

-- Meanings for 'set' (word_id = 2)
INSERT INTO meanings (word_id, part_of_speech, definition, example_sentence) VALUES
(2, 'verb', 'to put, lay, or stand (something) in a specified place or position.', 'She set the vase on the table.'),
(2, 'noun', 'a group of things that belong together or are used together.', 'He bought a new set of tools.');

-- Meanings for 'go' (word_id = 3)
INSERT INTO meanings (word_id, part_of_speech, definition, example_sentence) VALUES
(3, 'verb', 'to move from one place to another; travel.', 'I have to go to the store for some milk.'),
(3, 'verb', 'to happen or proceed in a particular way.', 'How did the meeting go?'); 