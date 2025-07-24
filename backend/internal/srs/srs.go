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
// This marks the word as being shown to the user.
func GetNextWordForReview(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID, source string) (*models.MeaningForReview, error) {
	// 1. 检查用户是否有当日计划
	hasDailyPlan, err := checkDailyPlanExists(ctx, db, userID)
	if err != nil {
		log.Printf("Error checking if daily plan exists: %v", err)
		// 继续执行，假设没有每日计划
	}

	// 2. 如果有当日计划，检查是否已完成全部单词
	if hasDailyPlan {
		completed, total, err := getDailyPlanProgress(ctx, db, userID)
		if err != nil {
			log.Printf("Error getting daily plan progress: %v", err)
			// 继续执行，假设计划未完成
		} else if completed >= total && total > 0 {
			// 如果当日计划单词已全部完成，直接返回NotFound
			log.Printf("User %s has completed their daily plan (%d/%d words)", userID, completed, total)
			return nil, database.ErrNotFound
		}

		// 3. 如果有当日计划且未全部完成，从计划中获取单词
		meaning, err := getNextWordFromDailyPlan(ctx, db, userID)
		if err == nil && meaning != nil {
			log.Printf("Found next word from daily plan for user %s", userID)
			return meaning, nil
		}
		if err != nil && !errors.Is(err, database.ErrNotFound) {
			log.Printf("Error fetching from daily plan: %v", err)
			// 如果有其他错误，继续尝试获取单词
		} else {
			// 如果是NotFound错误（即所有单词已学习完毕），直接返回
			log.Printf("No more words in daily plan for user %s", userID)
			return nil, database.ErrNotFound
		}
	}

	// 4. 回退到原始逻辑（仅在没有每日计划时）
	log.Printf("No daily plan found for user %s, falling back to original logic", userID)

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
			return nil, database.ErrNotFound
		}
		return nil, err
	}

	log.Printf("Retrieved meaning from general pool: ID=%d, WordID=%d, Lemma=%s",
		m.ID, m.WordID, m.Lemma)

	return processMeaningForReview(&m), nil
}

// PeekNextWordForReview 预览下一个待学习的单词，但不标记为已展示给用户
// 这个函数与GetNextWordForReview逻辑相似，但不会修改数据库状态
func PeekNextWordForReview(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID, source string) (*models.MeaningForReview, error) {
	// 优先从每日计划中获取下一个单词
	meaning, err := peekNextWordFromDailyPlan(ctx, db, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, database.ErrNotFound
		}
		return nil, err
	}

	return meaning, nil
}

// getNextWordFromDailyPlan tries to fetch the next word from the user's most recent daily plan.
func getNextWordFromDailyPlan(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID) (*models.MeaningForReview, error) {
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

	row := db.QueryRow(ctx, query, userID)

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

// peekNextWordFromDailyPlan 查看用户最近的每日计划中的下一个单词，但不更新状态
func peekNextWordFromDailyPlan(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID) (*models.MeaningForReview, error) {
	// 查询与getNextWordFromDailyPlan相似，但不包括更新状态的逻辑
	var meaning models.MeaningForReview

	query := `
		SELECT m.id as meaning_id, w.lemma as word, m.definition, m.part_of_speech, 
			   es.text as example_sentence, es.translation as example_sentence_translation
		FROM daily_plan_items dpi
		JOIN daily_plans dp ON dp.id = dpi.daily_plan_id
		JOIN meanings m ON m.id = dpi.meaning_id
		JOIN words w ON w.id = m.word_id
		LEFT JOIN example_sentences es ON es.meaning_id = m.id AND es.is_primary = true
		WHERE dp.user_id = $1 
		AND dp.created_at = (SELECT MAX(created_at) FROM daily_plans WHERE user_id = $1)
		AND dpi.status = 'pending'
		ORDER BY dpi.order ASC
		LIMIT 1
	`

	err := db.QueryRow(ctx, query, userID).Scan(
		&meaning.MeaningID,
		&meaning.Word,
		&meaning.Definition,
		&meaning.PartOfSpeech,
		&meaning.ExampleSentence,
		&meaning.ExampleSentenceTranslation,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, database.ErrNotFound
		}
		return nil, err
	}

	return &meaning, nil
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
