package srs

import (
	"context"
	"errors"
	"log"
	"math"
	"regexp"
	"sentencease/backend/internal/database"
	"sentencease/backend/internal/models"
	"strings"
	"time"
	"unicode"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GetNextWordForReview finds the next meaning for a user to review.
// It prioritizes words that are due for review. If no words are due, it returns a new, never-seen word.
// If a source is provided, it filters words from that source.
func GetNextWordForReview(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID, source string) (*models.MeaningForReview, error) {
	var err error
	// 1. Check for a daily plan first
	meaning, err := getNextWordFromDailyPlan(ctx, db, userID)
	if err == nil && meaning != nil {
		log.Printf("Found next word from daily plan for user %s", userID)
		return meaning, nil
	}
	if err != nil && !errors.Is(err, database.ErrNotFound) {
		log.Printf("Error fetching from daily plan: %v", err)
		// Don't return, fall back to the old logic
	}

	// 2. Fallback to the original logic if no daily plan or plan is empty
	log.Printf("No word from daily plan, falling back to original logic for user %s", userID)
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
	err = row.Scan(
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

	log.Printf("Retrieved meaning: ID=%d, WordID=%d, PartOfSpeech=%s, Definition=%s, Lemma=%s",
		m.ID, m.WordID, m.PartOfSpeech, m.Definition, m.Lemma)

	return processMeaningForReview(&m), nil
}

// getNextWordFromDailyPlan tries to fetch the next word from the user's most recent daily plan.
func getNextWordFromDailyPlan(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID) (*models.MeaningForReview, error) {
	query := `
		WITH latest_plan AS (
			SELECT id FROM daily_plans
			WHERE user_id = $1 AND created_at >= current_date
			ORDER BY created_at DESC
			LIMIT 1
		)
		SELECT m.id, m.word_id, m.part_of_speech, m.definition, m.example_sentence, m.example_sentence_translation, w.lemma
		FROM meanings m
		JOIN words w ON m.word_id = w.id
		JOIN daily_plan_words dpw ON m.id = dpw.meaning_id
		LEFT JOIN user_progress up ON m.id = up.meaning_id AND up.user_id = $1
		WHERE dpw.plan_id = (SELECT id FROM latest_plan)
		  AND (up.user_id IS NULL OR up.next_review_at <= $2)
		ORDER BY up.next_review_at ASC NULLS LAST, random()
		LIMIT 1;
	`
	args := []interface{}{userID, time.Now()}

	row := db.QueryRow(ctx, query, args...)

	var m models.Meaning
	err := row.Scan(
		&m.ID, &m.WordID, &m.PartOfSpeech, &m.Definition, &m.ExampleSentence, &m.ExampleSentenceTranslation, &m.Lemma,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, database.ErrNotFound // No words in plan or all reviewed
		}
		return nil, err
	}
	return processMeaningForReview(&m), nil
}

// processMeaningForReview takes a Meaning object and enriches it for review.
func processMeaningForReview(m *models.Meaning) *models.MeaningForReview {
	log.Printf("Processing meaning: ID=%d, WordID=%d, PartOfSpeech=%s, Definition=%s, Lemma=%s",
		m.ID, m.WordID, m.PartOfSpeech, m.Definition, m.Lemma)
	wordInSentence := findWordInSentence(m.ExampleSentence, m.Lemma)
	// 检查词性是否为空或不是中文，如果是则尝试修复
	if m.PartOfSpeech == "" || !containsChineseCharacters(m.PartOfSpeech) {
		// 尝试从定义中提取词性
		pos := extractPartOfSpeech(m.Definition)
		if pos != "" {
			m.PartOfSpeech = pos
		} else {
			// 如果无法提取，使用默认词性
			m.PartOfSpeech = ""
		}
	}
	// 检查定义是否为英文而不是中文，如果是则尝试将其标记为需要修复
	if !containsChineseCharacters(m.Definition) {
		m.Definition = "[需要翻译] " + m.Definition
	}
	reviewMeaning := &models.MeaningForReview{
		MeaningID:                  m.ID,
		PartOfSpeech:               m.PartOfSpeech,
		Definition:                 m.Definition,
		ExampleSentence:            m.ExampleSentence,
		ExampleSentenceTranslation: m.ExampleSentenceTranslation,
		Lemma:                      m.Lemma,
		Word:                       wordInSentence,
	}
	return reviewMeaning
}

// UpdateProgress updates a user's progress for a specific meaning based on their self-assessment.
func UpdateProgress(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID, meaningID int, userChoice string) error {
	// 记录所有操作，帮助调试
	log.Printf("Updating progress for user %s on meaning %d with choice: %s", userID, meaningID, userChoice)

	tx, err := db.Begin(ctx)
	if err != nil {
		log.Printf("Error beginning transaction: %v", err)
		return err
	}
	defer tx.Rollback(ctx) // 始终尝试回滚，如果事务已提交则无效

	// Get current progress
	var progress models.UserProgress
	query := `SELECT srs_stage FROM user_progress WHERE user_id = $1 AND meaning_id = $2;`
	err = tx.QueryRow(ctx, query, userID, meaningID).Scan(&progress.SRSStage)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// This is a new word for the user, so create initial progress record.
			log.Printf("No existing progress found for user %s and meaning %d. Starting at stage 0.", userID, meaningID)
			progress.SRSStage = 0 // Start at stage 0
		} else {
			log.Printf("Error querying current progress: %v", err)
			return err
		}
	} else {
		log.Printf("Found existing progress for user %s and meaning %d: stage %d", userID, meaningID, progress.SRSStage)
	}

	// Calculate new SRS stage
	newStage := calculateNextStage(progress.SRSStage, userChoice)
	log.Printf("Calculated new SRS stage: %d (from %d)", newStage, progress.SRSStage)

	// Calculate next review interval
	nextInterval := calculateNextInterval(newStage)
	nextReviewAt := time.Now().Add(nextInterval)
	log.Printf("Next review scheduled at: %v (in %v)", nextReviewAt, nextInterval)

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
		log.Printf("Error upserting progress: %v", err)
		return err
	}

	err = tx.Commit(ctx)
	if err != nil {
		log.Printf("Error committing transaction: %v", err)
		return err
	}

	log.Printf("Progress successfully updated for user %s on meaning %d", userID, meaningID)
	return nil
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

// containsChineseCharacters 检查字符串是否包含中文字符
func containsChineseCharacters(s string) bool {
	for _, r := range s {
		if unicode.Is(unicode.Han, r) {
			return true
		}
	}
	return false
}

// extractPartOfSpeech 尝试从定义中提取词性
func extractPartOfSpeech(definition string) string {
	// 常见英文词性及其中文对应
	posMap := map[string]string{
		"n.":      "名词",
		"v.":      "动词",
		"vt.":     "及物动词",
		"vi.":     "不及物动词",
		"adj.":    "形容词",
		"adv.":    "副词",
		"prep.":   "介词",
		"conj.":   "连词",
		"interj.": "感叹词",
		"pron.":   "代词",
		"num.":    "数词",
		"art.":    "冠词",
	}

	// 检查定义是否以常见词性标记开头
	for eng, chn := range posMap {
		if strings.HasPrefix(definition, eng) {
			return chn
		}
	}

	return ""
}
