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

// Load loads configuration from environment variables.
func Load() (*Config, error) {
	// Try loading .env from the current directory (for main app)
	// and from the parent directory (for seeder/other commands)
	err := godotenv.Load()
	if err != nil {
		err = godotenv.Load("../.env")
	}

	if err != nil {
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
