package srs

import (
	"context"
	"errors"
	"math"
	"regexp"
	"sentencease/backend/internal/database"
	"sentencease/backend/internal/models"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GetNextWordForReview finds the next meaning for a user to review.
// It prioritizes words that are due for review. If no words are due, it returns a new, never-seen word.
// If a source is provided, it filters words from that source.
func GetNextWordForReview(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID, source string) (*models.MeaningForReview, error) {
	// Base query
	query := `
		SELECT m.id, m.word_id, m.part_of_speech, m.definition, m.example_sentence, m.example_sentence_translation, w.lemma
		FROM meanings m
		JOIN words w ON m.word_id = w.id
		LEFT JOIN user_progress up ON m.id = up.meaning_id AND up.user_id = $1
	`
	args := []interface{}{userID, time.Now()}

	// Dynamically build the WHERE clause
	var whereClauses []string
	whereClauses = append(whereClauses, "( (up.user_id = $1 AND up.next_review_at <= $2) OR (up.user_id IS NULL) )")

	if source != "" {
		whereClauses = append(whereClauses, "w.source = $3")
		args = append(args, source)
	}

	query += " WHERE " + strings.Join(whereClauses, " AND ")
	query += " ORDER BY up.next_review_at ASC NULLS LAST, random() LIMIT 1;"

	row := db.QueryRow(ctx, query, args...)

	var m models.Meaning
	err := row.Scan(
		&m.ID,
		&m.WordID,
		&m.PartOfSpeech,
		&m.Definition,
		&m.ExampleSentence,
		&m.ExampleSentenceTranslation,
		&m.Lemma,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// This now correctly means the user has learned all words.
			return nil, database.ErrNotFound
		}
		// A real database error occurred.
		return nil, err
	}

	wordInSentence := findWordInSentence(m.ExampleSentence, m.Lemma)

	reviewMeaning := &models.MeaningForReview{
		MeaningID:                  m.ID,
		PartOfSpeech:               m.PartOfSpeech,
		Definition:                 m.Definition,
		ExampleSentence:            m.ExampleSentence,
		ExampleSentenceTranslation: m.ExampleSentenceTranslation,
		Lemma:                      m.Lemma,
		Word:                       wordInSentence,
	}

	return reviewMeaning, nil
}

// UpdateProgress updates a user's progress for a specific meaning based on their self-assessment.
func UpdateProgress(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID, meaningID int, userChoice string) error {
	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Get current progress
	var progress models.UserProgress
	query := `SELECT srs_stage FROM user_progress WHERE user_id = $1 AND meaning_id = $2;`
	err = tx.QueryRow(ctx, query, userID, meaningID).Scan(&progress.SRSStage)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// This is a new word for the user, so create initial progress record.
			progress.SRSStage = 0 // Start at stage 0
		} else {
			return err
		}
	}

	// Calculate new SRS stage
	newStage := calculateNextStage(progress.SRSStage, userChoice)

	// Calculate next review interval
	nextInterval := calculateNextInterval(newStage)
	nextReviewAt := time.Now().Add(nextInterval)

	// Upsert progress
	upsertQuery := `
		INSERT INTO user_progress (user_id, meaning_id, srs_stage, last_reviewed_at, next_review_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id, meaning_id) DO UPDATE SET
			srs_stage = EXCLUDED.srs_stage,
			last_reviewed_at = EXCLUDED.last_reviewed_at,
			next_review_at = EXCLUDED.next_review_at;`

	_, err = tx.Exec(ctx, upsertQuery, userID, meaningID, newStage, time.Now(), nextReviewAt)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// calculateNextStage determines the new SRS stage based on the current stage and user's choice.
func calculateNextStage(currentStage int, choice string) int {
	switch choice {
	case "认识":
		return currentStage + 1
	case "模糊":
		return int(math.Max(0, float64(currentStage-1))) // Go back one stage, but not below 0
	case "不认识":
		return 0 // Reset to the beginning
	default:
		return currentStage
	}
}

// calculateNextInterval calculates the duration until the next review.
// This is a simplified SRS interval calculation.
func calculateNextInterval(stage int) time.Duration {
	if stage <= 0 {
		return time.Hour * 4 // First review after 4 hours
	}
	// Exponential backoff: 1 day, 3 days, 7 days, etc.
	days := math.Pow(2.5, float64(stage-1))
	return time.Hour * 24 * time.Duration(days)
}

// findWordInSentence attempts to find the specific form of a lemma in a sentence.
// It handles simple cases like plurals (s, es) and past tense (ed, d).
// This is a simplistic approach and may not cover all grammatical variations.
func findWordInSentence(sentence, lemma string) string {
	// 1. First, try an exact match (case-insensitive)
	// The `\b` ensures we match whole words only.
	exactRegex := regexp.MustCompile(`(?i)\b` + regexp.QuoteMeta(lemma) + `\b`)
	if found := exactRegex.FindString(sentence); found != "" {
		return found
	}

	// 2. If no exact match, try to find variations.
	// This regex looks for the lemma followed by common suffixes (s, es, ed, ing, d).
	// It's a simple heuristic and might not be perfect.
	variationRegex := regexp.MustCompile(`(?i)\b` + regexp.QuoteMeta(lemma) + `(s|es|ed|ing|d)?\b`)
	foundVariations := variationRegex.FindAllString(sentence, -1)

	// If variations are found, return the first one. This is a heuristic.
	if len(foundVariations) > 0 {
		return foundVariations[0]
	}

	// 3. As a last resort, if no variations are found, return the original lemma.
	// The frontend will try its best, but might not highlight anything.
	return lemma
}
