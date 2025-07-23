package api

import (
	"context"
	"log"
	"net/http"

	"errors"
	"sentencease/backend/internal/auth"
	"sentencease/backend/internal/database"
	"sentencease/backend/internal/models"
	"sentencease/backend/internal/srs"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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

	meaning, err := srs.GetNextWordForReview(c.Request.Context(), a.DB, userID, source)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			c.JSON(http.StatusOK, gin.H{"message": "Congratulations! You have learned all available words."})
			return
		}
		log.Printf("Error getting next word for user %s: %v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get next word"})
		return
	}

	c.JSON(http.StatusOK, meaning)
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
