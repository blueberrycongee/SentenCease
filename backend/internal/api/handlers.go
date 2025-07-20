package api

import (
	"context"
	"log"
	"net/http"

	"sentencease/backend/internal/auth"
	"sentencease/backend/internal/models"

	"github.com/gin-gonic/gin"
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
