-- Seed the words table
INSERT INTO words (lemma) VALUES
('run'),
('set'),
('go');

-- Seed meanings table
INSERT INTO meanings (word_id, part_of_speech, definition, example_sentence, example_sentence_translation) VALUES
((SELECT id FROM words WHERE lemma = 'context'), 'noun', 'The circumstances that form the setting for an event, statement, or idea, and in terms of which it can be fully understood.', 'The meaning of a word can often be guessed from the context.', '一个词的意思常常可以从上下文中猜出来。'),
((SELECT id FROM words WHERE lemma = 'context'), 'noun', 'The parts of something written or spoken that immediately precede and follow a word or passage and clarify its meaning.', 'The context of the quote was lost in the summary.', '引文的上下文在摘要中丢失了。'),
((SELECT id FROM words WHERE lemma = 'vocabulary'), 'noun', 'The body of words used in a particular language.', 'He has a wide vocabulary.', '他的词汇量很大。'),
((SELECT id FROM words WHERE lemma = 'learn'), 'verb', 'Gain or acquire knowledge of or skill in (something) by study, experience, or being taught.', 'She is learning to play the piano.', '她正在学习弹钢琴。'),
((SELECT id FROM words WHERE lemma = 'sentence'), 'noun', 'A set of words that is complete in itself, typically containing a subject and predicate.', 'He writes in simple, clear sentences.', '他用简单明了的句子写作。'),
((SELECT id FROM words WHERE lemma = 'run'), 'verb', 'Move at a speed faster than a walk, never having both or all the feet on the ground at the same time.', 'I can run a mile in five minutes.', '我五分钟能跑一英里。'),
((SELECT id FROM words WHERE lemma = 'run'), 'verb', 'Be in charge of; manage.', 'She runs a small hotel.', '她经营一家小旅馆。'),
((SELECT id FROM words WHERE lemma = 'run'), 'noun', 'A period of time during which a machine or computer is operating.', 'The program will have its first run tomorrow.', '这个程序明天第一次运行。'); 