package seeder

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"strings"

	"sentencease/backend/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Seeder is responsible for seeding the database with words.
type Seeder struct {
	db *pgxpool.Pool
}

// NewSeeder creates a new seeder.
func NewSeeder(db *pgxpool.Pool) *Seeder {
	return &Seeder{db: db}
}

// SeedDatabase inserts words and meanings into the database using a single transaction.
func (s *Seeder) SeedDatabase(ctx context.Context, words []models.Word, meanings []models.Meaning) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	wordIDMap := make(map[string]int)

	for _, word := range words {
		var id int
		// Try to insert, but if it conflicts (already exists), do nothing and return the existing id.
		err := tx.QueryRow(ctx, `
			INSERT INTO words (lemma, source) VALUES ($1, $2)
			ON CONFLICT (lemma, source) DO NOTHING
			RETURNING id
		`, word.Lemma, word.Source).Scan(&id)
		if err != nil {
			// If the insert returned no rows, it means the word already exists. Get its ID.
			err = tx.QueryRow(ctx, "SELECT id FROM words WHERE lemma = $1 AND source = $2", word.Lemma, word.Source).Scan(&id)
			if err != nil {
				log.Printf("Error fetching existing word ID for %s with source %s: %v", word.Lemma, word.Source, err)
				continue
			}
		}
		wordIDMap[word.Lemma] = id
	}

	for _, meaning := range meanings {
		wordID, ok := wordIDMap[meaning.Lemma]
		if !ok {
			log.Printf("Warning: Could not find word ID for meaning with lemma '%s', skipping.", meaning.Lemma)
			continue
		}

		_, err := tx.Exec(ctx, `
			INSERT INTO meanings (word_id, part_of_speech, definition, example_sentence, example_sentence_translation, unit)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (word_id, definition) DO NOTHING
		`, wordID, meaning.PartOfSpeech, meaning.Definition, meaning.ExampleSentence, meaning.ExampleSentenceTranslation, meaning.Unit)
		if err != nil {
			// Log the error but continue, to not fail the entire batch.
			log.Printf("Error inserting meaning for word %s: %v", meaning.Lemma, err)
		}
	}

	log.Println("Committing transaction...")
	return tx.Commit(ctx)
}

// LoadWordsFromDirectory reads all JSON files from a directory matching the source and transforms them into our application's models.
func (s *Seeder) LoadWordsFromDirectory(path, source string) ([]models.Word, []models.Meaning, error) {
	files, err := os.ReadDir(path)
	if err != nil {
		return nil, nil, err
	}

	var words []models.Word
	var meanings []models.Meaning
	wordMap := make(map[string]struct{}) // Use a set to track unique lemmas

	for _, file := range files {
		if filepath.Ext(file.Name()) == ".json" && strings.Contains(file.Name(), source) {
			log.Printf("Processing file: %s", file.Name())

			data, err := os.ReadFile(filepath.Join(path, file.Name()))
			if err != nil {
				log.Printf("ERROR: Could not read file %s: %v", file.Name(), err)
				continue
			}

			var sourceWords []KaoYanWord
			if err := json.Unmarshal(data, &sourceWords); err != nil {
				log.Printf("ERROR: Could not unmarshal JSON from %s: %v. Check if the file is a valid JSON array.", file.Name(), err)
				continue
			}

			for _, sw := range sourceWords {
				if sw.Word == "" || len(sw.Translations) == 0 {
					continue
				}

				lemma := strings.ToLower(sw.Word)
				if _, exists := wordMap[lemma]; !exists {
					words = append(words, models.Word{Lemma: lemma, Source: source})
					wordMap[lemma] = struct{}{}
				}

				for _, trans := range sw.Translations {
					var exampleSentence, exampleTranslation string
					// Use the first available sentence as the example.
					if len(sw.Sentences) > 0 {
						exampleSentence = sw.Sentences[0].Sentence
						exampleTranslation = sw.Sentences[0].Translation
					}

					meaning := models.Meaning{
						Lemma:                      lemma,
						PartOfSpeech:               trans.Type,
						Definition:                 strings.TrimSpace(trans.Translation),
						ExampleSentence:            exampleSentence,
						ExampleSentenceTranslation: &exampleTranslation,
						Unit:                       sw.Unit,
					}
					meanings = append(meanings, meaning)
				}
			}
		}
	}

	return words, meanings, nil
}
