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

	// We assume the script is run from the `backend` directory.
	// The path to the data is relative to the `backend` directory.
	dataDir := filepath.Join("data", "english-vocabulary", "json_original", "json-sentence")

	words, meanings, err := seederInstance.LoadWordsFromDirectory(dataDir, "KaoYan")
	if err != nil {
		log.Fatalf("could not load words from directory: %v", err)
	}

	log.Printf("Loaded %d words and %d meanings.", len(words), len(meanings))

	if err := seederInstance.SeedDatabase(context.Background(), words, meanings); err != nil {
		log.Fatalf("could not seed database: %v", err)
	}

	log.Println("Seeding complete!")
}
