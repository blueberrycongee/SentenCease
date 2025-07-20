package srs

import (
	"context"
	"errors"
	"math"
	"sentencease/backend/internal/database"
	"sentencease/backend/internal/models"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GetNextWordForReview finds the next meaning for a user to review.
// It prioritizes words that are due for review. If no words are due, it returns a new, never-seen word.
func GetNextWordForReview(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID) (*models.Meaning, error) {
	// First, try to find a meaning that is due for review.
	query := `
		SELECT m.id, m.word_id, m.part_of_speech, m.definition, m.example_sentence, m.example_sentence_translation, w.lemma
		FROM meanings m
		JOIN words w ON m.word_id = w.id
		JOIN user_progress up ON m.id = up.meaning_id
		WHERE up.user_id = $1 AND up.next_review_at <= $2
		ORDER BY up.next_review_at
		LIMIT 1;`

	row := db.QueryRow(ctx, query, userID, time.Now())

	var meaning models.Meaning
	err := row.Scan(
		&meaning.ID,
		&meaning.WordID,
		&meaning.PartOfSpeech,
		&meaning.Definition,
		&meaning.ExampleSentence,
		&meaning.ExampleSentenceTranslation,
		&meaning.Lemma,
	)

	if err == nil {
		// Found a word to review
		return &meaning, nil
	}

	if !errors.Is(err, pgx.ErrNoRows) {
		// A real database error occurred
		return nil, err
	}

	// If no words are due for review, find a new word that the user has never seen.
	queryNew := `
		SELECT m.id, m.word_id, m.part_of_speech, m.definition, m.example_sentence, m.example_sentence_translation, w.lemma
		FROM meanings m
		JOIN words w ON m.word_id = w.id
		WHERE NOT EXISTS (
			SELECT 1 FROM user_progress up WHERE up.user_id = $1 AND up.meaning_id = m.id
		)
		ORDER BY random()
		LIMIT 1;`

	rowNew := db.QueryRow(ctx, queryNew, userID)
	errNew := rowNew.Scan(
		&meaning.ID,
		&meaning.WordID,
		&meaning.PartOfSpeech,
		&meaning.Definition,
		&meaning.ExampleSentence,
		&meaning.ExampleSentenceTranslation,
		&meaning.Lemma,
	)

	if errors.Is(errNew, pgx.ErrNoRows) {
		// No new words available, and nothing to review.
		return nil, database.ErrNotFound
	}

	return &meaning, errNew
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
