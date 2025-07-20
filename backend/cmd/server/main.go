package main

import (
	"log"

	"sentencease/backend/internal/api"
	"sentencease/backend/internal/config"
	"sentencease/backend/internal/database"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load application configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Connect to the database
	dbPool, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer dbPool.Close()

	// Initialize Gin router
	router := gin.Default()

	// Create API handler instance
	apiHandler := api.New(dbPool, cfg.JWTSecretKey)

	// Setup routes
	v1 := router.Group("/api/v1")
	{
		authRoutes := v1.Group("/auth")
		{
			authRoutes.POST("/register", apiHandler.Register)
			authRoutes.POST("/login", apiHandler.Login)
		}
	}

	// Start the server
	log.Println("Starting server on :8080")
	if err := router.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
