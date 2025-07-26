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

// GetNextWordForReview finds the next word for a user to review, returning a full WordReviewCard.
func GetNextWordForReview(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID, source string) (*models.WordReviewCard, error) {
	// 1. Check for a daily plan.
	hasDailyPlan, err := checkDailyPlanExists(ctx, db, userID)
	if err != nil {
		log.Printf("Error checking if daily plan exists: %v", err)
	}

	// 2. If a daily plan exists, try to get the next word from it.
	if hasDailyPlan {
		completed, total, err := getDailyPlanProgress(ctx, db, userID)
		if err != nil {
			log.Printf("Error getting daily plan progress: %v", err)
		} else if completed >= total && total > 0 {
			log.Printf("User %s has completed their daily plan (%d/%d words)", userID, completed, total)
			return nil, database.ErrNotFound
		}

		wordCard, err := getNextWordFromDailyPlan(ctx, db, userID)
		if err == nil && wordCard != nil {
			log.Printf("Found next word from daily plan for user %s", userID)
			return wordCard, nil
		}
		if err != nil && !errors.Is(err, database.ErrNotFound) {
			log.Printf("Error fetching from daily plan: %v", err)
		} else if errors.Is(err, database.ErrNotFound) {
			log.Printf("No more words in daily plan for user %s", userID)
			return nil, database.ErrNotFound
		}
	}

	// 3. Fallback to the original logic if no daily plan or plan is empty.
	log.Printf("No daily plan found for user %s, falling back to original logic", userID)

	// Step 1: Find a contextual meaning to review.
	contextualMeaningQuery := `
		SELECT m.id, m.word_id, m.part_of_speech, m.definition, m.example_sentence, m.example_sentence_translation, w.lemma
		FROM meanings m
		JOIN words w ON m.word_id = w.id
		LEFT JOIN user_progress up ON m.id = up.meaning_id AND up.user_id = $1
		WHERE ((up.user_id = $1 AND up.next_review_at <= $2) OR up.user_id IS NULL)
	`
	args := []interface{}{userID, time.Now()}

	if source != "" {
		contextualMeaningQuery += " AND w.source = $3"
		args = append(args, source)
	}
	contextualMeaningQuery += " ORDER BY up.next_review_at ASC NULLS LAST, random() LIMIT 1;"

	var contextualMeaning models.Meaning
	err = db.QueryRow(ctx, contextualMeaningQuery, args...).Scan(
		&contextualMeaning.ID,
		&contextualMeaning.WordID,
		&contextualMeaning.PartOfSpeech,
		&contextualMeaning.Definition,
		&contextualMeaning.ExampleSentence,
		&contextualMeaning.ExampleSentenceTranslation,
		&contextualMeaning.Lemma,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, database.ErrNotFound
		}
		return nil, err
	}

	// Step 2: Fetch all meanings for the determined word_id.
	return buildWordReviewCard(ctx, db, &contextualMeaning)
}

// PeekNextWordForReview previews the next word without marking it as shown.
func PeekNextWordForReview(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID, source string) (*models.WordReviewCard, error) {
	// This function should ideally mirror the logic of GetNextWordForReview but without state changes.
	// For now, it will prioritize the daily plan.
	wordCard, err := peekNextWordFromDailyPlan(ctx, db, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, database.ErrNotFound
		}
		return nil, err
	}
	return wordCard, nil
}

// getNextWordFromDailyPlan fetches the next word from the user's daily plan.
func getNextWordFromDailyPlan(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID) (*models.WordReviewCard, error) {
	// This query finds the next un-reviewed meaning from the latest daily plan.
	query := `
		WITH latest_plan AS (
			SELECT id FROM daily_plans
			WHERE user_id = $1 AND created_at >= current_date
			ORDER BY created_at DESC
			LIMIT 1
		),
		reviewed_words AS (
			SELECT dpw.meaning_id 
			FROM daily_plan_words dpw
			JOIN user_progress up ON dpw.meaning_id = up.meaning_id AND up.user_id = $1
			WHERE dpw.plan_id = (SELECT id FROM latest_plan)
			AND up.last_reviewed_at >= current_date
		)
		SELECT m.id, m.word_id, m.part_of_speech, m.definition, m.example_sentence, m.example_sentence_translation, w.lemma
		FROM meanings m
		JOIN words w ON m.word_id = w.id
		JOIN daily_plan_words dpw ON m.id = dpw.meaning_id
		LEFT JOIN reviewed_words rw ON m.id = rw.meaning_id
		WHERE dpw.plan_id = (SELECT id FROM latest_plan)
		  AND rw.meaning_id IS NULL
		ORDER BY m.id
		LIMIT 1;
	`
	var contextualMeaning models.Meaning
	err := db.QueryRow(ctx, query, userID).Scan(
		&contextualMeaning.ID, &contextualMeaning.WordID, &contextualMeaning.PartOfSpeech, &contextualMeaning.Definition, &contextualMeaning.ExampleSentence, &contextualMeaning.ExampleSentenceTranslation, &contextualMeaning.Lemma,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, database.ErrNotFound
		}
		return nil, err
	}
	return buildWordReviewCard(ctx, db, &contextualMeaning)
}

// peekNextWordFromDailyPlan peeks at the next word in the daily plan without updates.
func peekNextWordFromDailyPlan(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID) (*models.WordReviewCard, error) {
	// This logic needs to be adapted to fetch a contextual meaning first, then build the card.
	// For simplicity, we'll find the next pending item and use it as context.
	query := `
		WITH latest_plan AS (
			SELECT id FROM daily_plans
			WHERE user_id = $1 AND created_at >= current_date
			ORDER BY created_at DESC
			LIMIT 1
		),
		reviewed_words AS (
			SELECT dpw.meaning_id 
			FROM daily_plan_words dpw
			JOIN user_progress up ON dpw.meaning_id = up.meaning_id AND up.user_id = $1
			WHERE dpw.plan_id = (SELECT id FROM latest_plan)
			AND up.last_reviewed_at >= current_date
		)
		SELECT m.id, m.word_id, m.part_of_speech, m.definition, m.example_sentence, m.example_sentence_translation, w.lemma
		FROM meanings m
		JOIN words w ON m.word_id = w.id
		JOIN daily_plan_words dpw ON m.id = dpw.meaning_id
		LEFT JOIN reviewed_words rw ON m.id = rw.meaning_id
		WHERE dpw.plan_id = (SELECT id FROM latest_plan)
		  AND rw.meaning_id IS NULL
		ORDER BY m.id
		LIMIT 1;
	`
	var contextualMeaning models.Meaning
	err := db.QueryRow(ctx, query, userID).Scan(
		&contextualMeaning.ID, &contextualMeaning.WordID, &contextualMeaning.PartOfSpeech, &contextualMeaning.Definition, &contextualMeaning.ExampleSentence, &contextualMeaning.ExampleSentenceTranslation, &contextualMeaning.Lemma,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, database.ErrNotFound
		}
		return nil, err
	}
	return buildWordReviewCard(ctx, db, &contextualMeaning)
}

// buildWordReviewCard constructs a WordReviewCard from a contextual meaning.
func buildWordReviewCard(ctx context.Context, db *pgxpool.Pool, contextualMeaning *models.Meaning) (*models.WordReviewCard, error) {
	// Query for all meanings of the word.
	allMeaningsQuery := `
		SELECT id, part_of_speech, definition
		FROM meanings
		WHERE word_id = $1
		ORDER BY id;
	`
	rows, err := db.Query(ctx, allMeaningsQuery, contextualMeaning.WordID)
	if err != nil {
		log.Printf("Error fetching all meanings for word_id %d: %v", contextualMeaning.WordID, err)
		return nil, err
	}
	defer rows.Close()

	var allMeanings []models.MeaningInfo
	for rows.Next() {
		var meaningInfo models.MeaningInfo
		if err := rows.Scan(&meaningInfo.MeaningID, &meaningInfo.PartOfSpeech, &meaningInfo.Definition); err != nil {
			return nil, err
		}
		allMeanings = append(allMeanings, meaningInfo)
	}

	if len(allMeanings) == 0 {
		log.Printf("No meanings found for word_id %d, which should not happen.", contextualMeaning.WordID)
		// Fallback: create a MeaningInfo from the contextual meaning
		allMeanings = append(allMeanings, models.MeaningInfo{
			MeaningID:    contextualMeaning.ID,
			PartOfSpeech: contextualMeaning.PartOfSpeech,
			Definition:   contextualMeaning.Definition,
		})
	}

	wordInSentence := findWordInSentence(contextualMeaning.ExampleSentence, contextualMeaning.Lemma)

	reviewCard := &models.WordReviewCard{
		ContextualMeaningID:        contextualMeaning.ID,
		WordID:                     contextualMeaning.WordID,
		Lemma:                      contextualMeaning.Lemma,
		WordInSentence:             wordInSentence,
		ExampleSentence:            contextualMeaning.ExampleSentence,
		ExampleSentenceTranslation: contextualMeaning.ExampleSentenceTranslation,
		AllMeanings:                allMeanings,
	}

	return reviewCard, nil
}

// UpdateProgress updates a user's progress for a specific meaning based on their self-assessment.
func UpdateProgress(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID, meaningID int, userChoice string) error {
	// 记录所有操作，帮助调试
	log.Printf("Updating progress for user %s on meaning %d with choice: %s", userID, meaningID, userChoice)

	// 获取使用的SRS算法
	algorithm, err := GetSRSAlgorithm(ctx, db)
	if err != nil {
		log.Printf("Error getting SRS algorithm: %v, using default (sspmmc)", err)
		algorithm = "sspmmc" // 默认使用SSP-MMC
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		log.Printf("Error beginning transaction: %v", err)
		return err
	}
	defer tx.Rollback(ctx) // 始终尝试回滚，如果事务已提交则无效

	// 获取单词信息
	var meaning models.Meaning
	meaningQuery := `SELECT id, word_id, difficulty FROM meanings WHERE id = $1`
	err = tx.QueryRow(ctx, meaningQuery, meaningID).Scan(&meaning.ID, &meaning.WordID, &meaning.Difficulty)
	if err != nil {
		log.Printf("Error fetching meaning info: %v", err)
		return err
	}

	// 获取当前进度
	var progress models.UserProgress
	query := `SELECT 
		srs_stage, 
		COALESCE(memory_halflife, 4.0) as memory_halflife,
		COALESCE(review_count, 0) as review_count
		FROM user_progress 
		WHERE user_id = $1 AND meaning_id = $2;`

	err = tx.QueryRow(ctx, query, userID, meaningID).Scan(
		&progress.SRSStage,
		&progress.MemoryHalfLife,
		&progress.ReviewCount,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// This is a new word for the user, so create initial progress record.
			log.Printf("No existing progress found for user %s and meaning %d. Starting at stage 0.", userID, meaningID)
			progress.SRSStage = 0         // Start at stage 0
			progress.MemoryHalfLife = 4.0 // 默认初始半衰期4小时
		} else {
			log.Printf("Error querying current progress: %v", err)
			return err
		}
	} else {
		log.Printf("Found existing progress for user %s and meaning %d: stage %d", userID, meaningID, progress.SRSStage)
	}

	// 根据选择的算法更新进度
	if algorithm == "sspmmc" {
		// 使用SSP-MMC算法
		// 将单词意义ID和用户选择传递给sspmmc.go中的函数
		progress.MeaningID = meaningID
		progress.UserID = userID

		// 调用SSP-MMC算法更新进度
		UpdateProgressWithSSPMMC(&progress, &meaning, userChoice)

		// Upsert progress with SSP-MMC fields
		upsertQuery := `
			INSERT INTO user_progress 
				(user_id, meaning_id, srs_stage, last_reviewed_at, next_review_at,
				 memory_halflife, optimal_interval, review_count, last_recall_success)
			VALUES 
				($1, $2, $3, $4, $5, $6, $7, $8, $9)
			ON CONFLICT (user_id, meaning_id) DO UPDATE SET
				srs_stage = EXCLUDED.srs_stage,
				last_reviewed_at = EXCLUDED.last_reviewed_at,
				next_review_at = EXCLUDED.next_review_at,
				memory_halflife = EXCLUDED.memory_halflife,
				optimal_interval = EXCLUDED.optimal_interval,
				review_count = EXCLUDED.review_count,
				last_recall_success = EXCLUDED.last_recall_success;`

		_, err = tx.Exec(ctx, upsertQuery,
			userID, meaningID, progress.SRSStage, time.Now(), progress.NextReviewAt,
			progress.MemoryHalfLife, progress.OptimalInterval, progress.ReviewCount,
			progress.LastRecallSuccess)
		if err != nil {
			log.Printf("Error upserting progress with SSP-MMC: %v", err)
			return err
		}
	} else {
		// 使用传统算法（向后兼容）
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

// checkDailyPlanExists 检查用户是否有当日学习计划
func checkDailyPlanExists(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM daily_plans 
			WHERE user_id = $1 AND created_at >= current_date
		)
	`

	var exists bool
	err := db.QueryRow(ctx, query, userID).Scan(&exists)
	if err != nil {
		return false, err
	}

	return exists, nil
}

// getDailyPlanProgress 获取当日计划的进度
func getDailyPlanProgress(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID) (int, int, error) {
	// 获取今日计划中的单词总数
	totalQuery := `
		WITH latest_plan AS (
			SELECT id FROM daily_plans
			WHERE user_id = $1 AND created_at >= current_date
			ORDER BY created_at DESC
			LIMIT 1
		)
		SELECT COUNT(*) AS total_words
		FROM daily_plan_words
		WHERE plan_id = (SELECT id FROM latest_plan)
	`

	var totalWords int
	err := db.QueryRow(ctx, totalQuery, userID).Scan(&totalWords)
	if err != nil {
		return 0, 0, err
	}

	// 获取今日已完成的单词数量
	completedQuery := `
		WITH latest_plan AS (
			SELECT id FROM daily_plans
			WHERE user_id = $1 AND created_at >= current_date
			ORDER BY created_at DESC
			LIMIT 1
		)
		SELECT COUNT(*) AS completed_words
		FROM daily_plan_words dpw
		JOIN user_progress up ON dpw.meaning_id = up.meaning_id AND up.user_id = $1
		WHERE dpw.plan_id = (SELECT id FROM latest_plan)
		  AND up.last_reviewed_at >= current_date
	`

	var completedWords int
	err = db.QueryRow(ctx, completedQuery, userID).Scan(&completedWords)
	if err != nil {
		return 0, 0, err
	}

	return completedWords, totalWords, nil
}

// GetSRSAlgorithm 从数据库获取当前使用的SRS算法
func GetSRSAlgorithm(ctx context.Context, db *pgxpool.Pool) (string, error) {
	var algorithm string
	query := `SELECT value FROM app_settings WHERE key = 'srs_algorithm'`

	err := db.QueryRow(ctx, query).Scan(&algorithm)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "sspmmc", nil // 默认使用SSP-MMC
		}
		return "", err
	}

	return algorithm, nil
}

// SetSRSAlgorithm 设置使用的SRS算法
func SetSRSAlgorithm(ctx context.Context, db *pgxpool.Pool, algorithm string) error {
	query := `
		INSERT INTO app_settings (key, value, description)
		VALUES ('srs_algorithm', $1, 'The spaced repetition algorithm used by the system')
		ON CONFLICT (key) DO UPDATE SET value = $1;`

	_, err := db.Exec(ctx, query, algorithm)
	return err
}
