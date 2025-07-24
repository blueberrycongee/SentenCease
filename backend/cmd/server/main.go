package main

import (
	"log"

	"sentencease/backend/internal/api"
	"sentencease/backend/internal/config"
	"sentencease/backend/internal/database"

	"github.com/gin-contrib/cors"
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

	// Setup CORS middleware
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Create API handler instance
	apiHandler := api.New(dbPool, cfg.JWTSecretKey)

	router.GET("/", apiHandler.RootHandler) // Keep a root handler for health checks

	// Group all routes under /api/v1
	v1 := router.Group("/api/v1")
	{
		// Public routes for authentication
		authRoutes := v1.Group("/auth")
		{
			authRoutes.POST("/register", apiHandler.Register)
			authRoutes.POST("/login", apiHandler.Login)
		}

		// Group for authenticated routes
		authRequired := v1.Group("/")
		authRequired.Use(api.AuthMiddleware(cfg.JWTSecretKey))
		{
			authRequired.GET("/learn/next", apiHandler.GetNextWord)
			authRequired.POST("/learn/review", apiHandler.ReviewWord)
			authRequired.GET("/learn/progress", apiHandler.GetLearningProgress)
			authRequired.GET("/user/stats", apiHandler.GetUserStats)
			authRequired.GET("/vocab-sources", apiHandler.GetVocabSources)
			authRequired.GET("/words/selection", apiHandler.GetWordsForSelection)
			authRequired.GET("/vocab-sources/:source/words", apiHandler.GetWordsBySource)
			authRequired.POST("/daily-plan", apiHandler.CreateDailyPlan)
		}

		// Debug routes - remove in production
		debugRoutes := v1.Group("/debug")
		{
			debugRoutes.GET("/word/:id", apiHandler.GetWordDetails)
		}
	}

	// Start server
	log.Println("Starting server on :8080")
	if err := router.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
