package api

import (
	"context"
	"database/sql"
	"log"
	"net/http"

	"errors"
	"sentencease/backend/internal/auth"
	"sentencease/backend/internal/database"
	"sentencease/backend/internal/models"
	"sentencease/backend/internal/srs"

	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// API holds the dependencies for the API handlers, such as the database pool.
type API struct {
	DB           *pgxpool.Pool
	JWTSecretKey string
}

// New creates a new API instance with the given database connection and JWT secret.
func New(db *pgxpool.Pool, jwtSecret string) *API {
	return &API{
		DB:           db,
		JWTSecretKey: jwtSecret,
	}
}

// Register handles new user registration.
func (a *API) Register(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	hashedPassword, err := auth.HashPassword(user.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}
	user.PasswordHash = hashedPassword

	query := `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`
	err = a.DB.QueryRow(context.Background(), query, user.Email, user.PasswordHash).Scan(&user.ID)
	if err != nil {
		log.Printf("Failed to register user: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register user. The email might already be taken."})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully", "userID": user.ID})
}

// Login handles user authentication and returns a JWT.
func (a *API) Login(c *gin.Context) {
	var loginRequest models.User
	if err := c.ShouldBindJSON(&loginRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	var storedUser models.User
	query := `SELECT id, password_hash FROM users WHERE email = $1`
	err := a.DB.QueryRow(context.Background(), query, loginRequest.Email).Scan(&storedUser.ID, &storedUser.PasswordHash)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if !auth.CheckPasswordHash(loginRequest.Password, storedUser.PasswordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	token, err := auth.GenerateJWT(storedUser.ID, a.JWTSecretKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token})
}

// GetNextWord fetches the next word for the user to learn or review.
func (a *API) GetNextWord(c *gin.Context) {
	userIDClaim, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in token"})
		return
	}

	userID, ok := userIDClaim.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format in token"})
		return
	}

	source := c.Query("source") // Get source from query parameter

	wordCard, err := srs.GetNextWordForReview(c.Request.Context(), a.DB, userID, source)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			c.JSON(http.StatusOK, gin.H{"message": "Congratulations! You have learned all available words."})
			return
		}
		log.Printf("Error getting next word for user %s: %v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get next word"})
		return
	}

	c.JSON(http.StatusOK, wordCard)
}

// PeekNextWord fetches a preview of the next word without affecting the learning queue.
func (a *API) PeekNextWord(c *gin.Context) {
	userIDClaim, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
		return
	}

	userID, ok := userIDClaim.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format in token"})
		return
	}

	source := c.Query("source")

	wordCard, err := srs.PeekNextWordForReview(c.Request.Context(), a.DB, userID, source)
	if err != nil {
		// More robust error handling: check for any 'not found' type error
		if errors.Is(err, database.ErrNotFound) {
			c.JSON(http.StatusOK, gin.H{"message": "当前没有更多单词了"})
			return
		}
		// Log the actual error for debugging and return a generic server error
		log.Printf("Error peeking next word for user %s: %v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "无法获取下一个单词"})
		return
	}

	c.JSON(http.StatusOK, wordCard)
}

// ReviewWord updates the user's progress on a word.
func (a *API) ReviewWord(c *gin.Context) {
	userIDClaim, exists := c.Get("userID")
	if !exists {
		log.Printf("ReviewWord: User ID not found in token")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in token"})
		return
	}

	userID, ok := userIDClaim.(uuid.UUID)
	if !ok {
		log.Printf("ReviewWord: Invalid user ID format in token")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format in token"})
		return
	}

	var req models.ReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("ReviewWord: Invalid request body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	log.Printf("ReviewWord: Processing review for user %s on meaning %d with choice %s",
		userID, req.MeaningID, req.UserChoice)

	// 验证meaningID是否存在
	var meaningExists bool
	checkQuery := `SELECT EXISTS(SELECT 1 FROM meanings WHERE id = $1)`
	err := a.DB.QueryRow(c.Request.Context(), checkQuery, req.MeaningID).Scan(&meaningExists)
	if err != nil {
		log.Printf("ReviewWord: Error checking meaning existence: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate meaning ID"})
		return
	}
	if !meaningExists {
		log.Printf("ReviewWord: Meaning ID %d does not exist", req.MeaningID)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid meaning ID: not found"})
		return
	}

	err = srs.UpdateProgress(c.Request.Context(), a.DB, userID, req.MeaningID, req.UserChoice)
	if err != nil {
		log.Printf("ReviewWord: Error updating progress for user %s on meaning %d: %v",
			userID, req.MeaningID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update progress: " + err.Error()})
		return
	}

	log.Printf("ReviewWord: Successfully updated progress for user %s on meaning %d",
		userID, req.MeaningID)
	c.JSON(http.StatusOK, gin.H{"message": "Progress updated successfully"})
}

func (a *API) GetVocabSources(c *gin.Context) {
	rows, err := a.DB.Query(c, "SELECT DISTINCT source FROM words WHERE source IS NOT NULL AND source <> ''")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query vocabulary sources"})
		return
	}
	defer rows.Close()

	var sources []string
	for rows.Next() {
		var source string
		if err := rows.Scan(&source); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan vocabulary source"})
			return
		}
		sources = append(sources, source)
	}

	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error iterating vocabulary sources"})
		return
	}

	c.JSON(http.StatusOK, sources)
}

func (a *API) GetWordsBySource(c *gin.Context) {
	source := c.Param("source")

	query := `
        SELECT m.id, w.lemma, m.unit
        FROM meanings m
        JOIN words w ON m.word_id = w.id
        WHERE w.source = $1
        ORDER BY m.unit, w.lemma
    `

	rows, err := a.DB.Query(c.Request.Context(), query, source)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query words by source"})
		return
	}
	defer rows.Close()

	type WordInfo struct {
		ID    int    `json:"id"`
		Lemma string `json:"lemma"`
		Unit  string `json:"unit"`
	}

	wordsByUnit := make(map[string][]WordInfo)
	for rows.Next() {
		var wi WordInfo
		var unit sql.NullString // Use sql.NullString for nullable unit column
		if err := rows.Scan(&wi.ID, &wi.Lemma, &unit); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan word info"})
			return
		}

		unitStr := "Default"
		if unit.Valid {
			unitStr = unit.String
		}
		wi.Unit = unitStr

		wordsByUnit[unitStr] = append(wordsByUnit[unitStr], wi)
	}

	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error iterating words by source"})
		return
	}

	c.JSON(http.StatusOK, wordsByUnit)
}

func (a *API) GetWordsForSelection(c *gin.Context) {
	source := c.Query("source")
	order := c.Query("order")
	countStr := c.Query("count")
	count, err := strconv.Atoi(countStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid count parameter"})
		return
	}

	if source == "" || order == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "source and order parameters are required"})
		return
	}

	query := `
        SELECT m.id, w.lemma, m.definition
        FROM meanings m
        JOIN words w ON m.word_id = w.id
        WHERE w.source = $1
    `

	if order == "random" {
		query += " ORDER BY random()"
	} else {
		query += " ORDER BY m.id" // or w.lemma, depending on desired sequential order
	}

	query += " LIMIT $2"

	rows, err := a.DB.Query(c.Request.Context(), query, source, count)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query words for selection"})
		return
	}
	defer rows.Close()

	type WordForSelection struct {
		ID         int    `json:"id"`
		Lemma      string `json:"lemma"`
		Definition string `json:"definition"`
	}

	var words []WordForSelection
	for rows.Next() {
		var word WordForSelection
		if err := rows.Scan(&word.ID, &word.Lemma, &word.Definition); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan word for selection"})
			return
		}
		words = append(words, word)
	}

	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error iterating words for selection"})
		return
	}

	c.JSON(http.StatusOK, words)
}

func (a *API) CreateDailyPlan(c *gin.Context) {
	userIDClaim, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in token"})
		return
	}

	userID, ok := userIDClaim.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format in token"})
		return
	}

	var req struct {
		MeaningIDs []int `json:"meaning_ids"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	tx, err := a.DB.Begin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	// Create a new daily plan
	var planID uuid.UUID
	err = tx.QueryRow(c.Request.Context(),
		`INSERT INTO daily_plans (user_id) VALUES ($1) RETURNING id`,
		userID).Scan(&planID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create daily plan"})
		return
	}

	// Insert into the join table
	for _, meaningID := range req.MeaningIDs {
		_, err := tx.Exec(c.Request.Context(),
			`INSERT INTO daily_plan_words (plan_id, meaning_id) VALUES ($1, $2)`,
			planID, meaningID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add words to daily plan"})
			return
		}
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Daily plan created successfully", "plan_id": planID})
}

// RootHandler provides a welcome message for the API root.
func (a *API) RootHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Welcome to the Sentencease API"})
}

// GetWordDetails fetches a specific meaning by ID for debugging purposes.
func (a *API) GetWordDetails(c *gin.Context) {
	meaningID := c.Param("id")
	if meaningID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Meaning ID is required"})
		return
	}

	var meaning models.Meaning
	query := `
		SELECT m.id, m.word_id, m.part_of_speech, m.definition, m.example_sentence, m.example_sentence_translation, w.lemma
		FROM meanings m
		JOIN words w ON m.word_id = w.id
		WHERE m.id = $1
	`
	err := a.DB.QueryRow(c.Request.Context(), query, meaningID).Scan(
		&meaning.ID,
		&meaning.WordID,
		&meaning.PartOfSpeech,
		&meaning.Definition,
		&meaning.ExampleSentence,
		&meaning.ExampleSentenceTranslation,
		&meaning.Lemma,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get word details: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, meaning)
}

// GetLearningProgress fetches the current learning progress for the user
func (a *API) GetLearningProgress(c *gin.Context) {
	userIDClaim, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in token"})
		return
	}

	userID, ok := userIDClaim.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format in token"})
		return
	}

	// 获取用户今日学习计划中的单词总数
	query := `
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
	err := a.DB.QueryRow(c.Request.Context(), query, userID).Scan(&totalWords)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusOK, gin.H{"total": 0, "completed": 0})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get learning plan"})
		return
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
	err = a.DB.QueryRow(c.Request.Context(), completedQuery, userID).Scan(&completedWords)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get completed words count"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"total": totalWords, "completed": completedWords})
}

// GetUserStats fetches the user's email and statistics about words learned
func (a *API) GetUserStats(c *gin.Context) {
	userIDClaim, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in token"})
		return
	}

	userID, ok := userIDClaim.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format in token"})
		return
	}

	// 获取用户邮箱
	var email string
	err := a.DB.QueryRow(c.Request.Context(), "SELECT email FROM users WHERE id = $1", userID).Scan(&email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user information"})
		return
	}

	// 获取用户已学习过的单词数量（至少点击过一次按钮）
	var learnedWordsCount int
	countQuery := `
		SELECT COUNT(DISTINCT meaning_id) 
		FROM user_progress 
		WHERE user_id = $1
	`
	err = a.DB.QueryRow(c.Request.Context(), countQuery, userID).Scan(&learnedWordsCount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get learned words count"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"email":             email,
		"learnedWordsCount": learnedWordsCount,
	})
}

// GetSRSAlgorithmInfo 返回当前使用的SRS算法信息
func (a *API) GetSRSAlgorithmInfo(c *gin.Context) {
	ctx := c.Request.Context()

	// 获取当前使用的SRS算法
	algorithm, err := srs.GetSRSAlgorithm(ctx, a.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get SRS algorithm info"})
		return
	}

	var info string
	if algorithm == "sspmmc" {
		info = srs.GetSSPMMCInfo()
	} else {
		info = "标准间隔重复算法，基于用户的记忆阶段和Ebbinghaus遗忘曲线调整间隔时间。"
	}

	c.JSON(http.StatusOK, gin.H{
		"algorithm": algorithm,
		"info":      info,
	})
}
