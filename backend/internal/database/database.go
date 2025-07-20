package database

import (
	"context"
	"errors"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is a standard error for when a requested item is not found in the database.
var ErrNotFound = errors.New("not found")

// Connect establishes a connection pool to the PostgreSQL database and verifies it.
// It implements a retry mechanism with exponential backoff to handle database startup delays.
func Connect(databaseURL string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}

	config.MaxConns = 10
	config.MinConns = 2
	config.MaxConnIdleTime = 5 * time.Minute

	var pool *pgxpool.Pool
	var connectionError error
	retryAttempts := 5
	retryDelay := 2 * time.Second

	for i := 0; i < retryAttempts; i++ {
		log.Printf("Attempting to connect to the database (attempt %d/%d)...", i+1, retryAttempts)

		pool, connectionError = pgxpool.NewWithConfig(context.Background(), config)
		if connectionError != nil {
			log.Printf("Failed to create connection pool: %v", connectionError)
			time.Sleep(retryDelay)
			retryDelay *= 2 // Exponential backoff
			continue
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		connectionError = pool.Ping(ctx)
		cancel() // cancel the context once done

		if connectionError == nil {
			log.Println("Successfully connected to the database.")
			return pool, nil
		}

		log.Printf("Failed to ping database: %v", connectionError)
		pool.Close() // Close the pool if ping fails
		time.Sleep(retryDelay)
		retryDelay *= 2 // Exponential backoff
	}

	log.Printf("Failed to connect to the database after %d attempts.", retryAttempts)
	return nil, connectionError
}
