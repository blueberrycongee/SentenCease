package config

import (
	"log"
	"os"
)

// Config holds all configuration for the application.
type Config struct {
	DatabaseURL  string
	JWTSecretKey string
}

// Load loads configuration from environment variables.
func Load() (*Config, error) {
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
