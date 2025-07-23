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
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in token"})
		return
	}

	userID, ok := userIDClaim.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format in token"})
		return
	}

	var req models.ReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	err := srs.UpdateProgress(c.Request.Context(), a.DB, userID, req.MeaningID, req.UserChoice)
	if err != nil {
		log.Printf("Error updating progress for user %s on meaning %d: %v", userID, req.MeaningID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update progress"})
		return
	}

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
