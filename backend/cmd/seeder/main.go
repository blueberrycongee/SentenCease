package main

import (
	"context"
	"log"
	"path/filepath"

	"sentencease/backend/internal/config"
	"sentencease/backend/internal/database"
	"sentencease/backend/internal/seeder"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("could not load config: %v", err)
	}

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("could not connect to database: %v", err)
	}
	defer db.Close()

	// Truncate tables before seeding
	log.Println("Truncating tables...")
	_, err = db.Exec(context.Background(), "TRUNCATE TABLE words, meanings, user_progress, daily_plans, daily_plan_words RESTART IDENTITY CASCADE")
	if err != nil {
		log.Fatalf("could not truncate tables: %v", err)
	}

	seederInstance := seeder.NewSeeder(db)

	dataDir := filepath.Join("data", "english-vocabulary", "json_original", "json-sentence")

	// List of all sources to be seeded
	sources := []string{
		"KaoYan",
	}

	for _, source := range sources {
		log.Printf("--- Seeding source: %s ---", source)
		words, meanings, err := seederInstance.LoadWordsFromDirectory(dataDir, source)
		if err != nil {
			log.Printf("could not load words for source %s: %v", source, err)
			continue // Continue with the next source
		}

		if len(words) == 0 {
			log.Printf("No words found for source %s, skipping.", source)
			continue
		}

		log.Printf("Loaded %d words and %d meanings for source %s.", len(words), len(meanings), source)

		if err := seederInstance.SeedDatabase(context.Background(), words, meanings); err != nil {
			log.Printf("could not seed database for source %s: %v", source, err)
			continue
		}
		log.Printf("--- Finished seeding source: %s ---", source)
	}

	log.Println("Seeding complete for all sources!")
}
