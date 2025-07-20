package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the application.
type Config struct {
	DatabaseURL  string
	JWTSecretKey string
}

// Load loads configuration from .env file or environment variables.
func Load() (*Config, error) {
	// Load .env file from the root, not from the current package directory
	err := godotenv.Load()
	if err != nil {
		// It's okay if .env file doesn't exist, we can rely on environment variables
		log.Println("No .env file found, reading from environment variables")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is not set")
	}

	jwtSecret := os.Getenv("JWT_SECRET_KEY")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET_KEY environment variable is not set")
	}

	return &Config{
		DatabaseURL:  dbURL,
		JWTSecretKey: jwtSecret,
	}, nil
}
