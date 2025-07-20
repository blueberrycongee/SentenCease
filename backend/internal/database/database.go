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
func Connect(databaseURL string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}

	// Set a reasonable connection timeout
	config.MaxConns = 10
	config.MinConns = 2
	config.MaxConnIdleTime = 5 * time.Minute

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, err
	}

	// Ping the database to verify the connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = pool.Ping(ctx)
	if err != nil {
		log.Printf("Failed to ping database: %v", err)
		return nil, err
	}

	log.Println("Successfully connected to the database.")
	return pool, nil
}
