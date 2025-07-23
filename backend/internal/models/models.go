package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user in the system.
// Note: Password field is for binding request data and is not stored in the database.
// PasswordHash is what's stored in the database.
type User struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email" binding:"required,email"`
	Password     string    `json:"password,omitempty" binding:"required,min=8"`
	PasswordHash string    `json:"-"` // Do not expose hash in JSON responses
}

// Word represents a word lemma.
type Word struct {
	ID     int    `json:"id"`
	Lemma  string `json:"lemma" binding:"required"`
	Source string `json:"source,omitempty"`
}

// Meaning represents a single definition and example for a word.
// It corresponds to the `meanings` table.
type Meaning struct {
	ID                         int     `json:"meaningId"`
	WordID                     int     `json:"wordId"`
	Lemma                      string  `json:"lemma"`
	PartOfSpeech               string  `json:"partOfSpeech"`
	Definition                 string  `json:"definition"`
	ExampleSentence            string  `json:"exampleSentence"`
	ExampleSentenceTranslation *string `json:"exampleSentenceTranslation,omitempty"`
}

// UserProgress represents the learning progress of a user for a specific meaning.
type UserProgress struct {
	UserID         uuid.UUID `json:"-"`
	MeaningID      int       `json:"-"`
	SRSStage       int       `json:"srsStage"`
	LastReviewedAt time.Time `json:"lastReviewedAt,omitempty"`
	NextReviewAt   time.Time `json:"nextReviewAt"`
}

// ReviewRequest is the structure for binding the request body of the POST /learn/review endpoint.
type ReviewRequest struct {
	MeaningID  int    `json:"meaningId" binding:"required"`
	UserChoice string `json:"userChoice" binding:"required,oneof=认识 模糊 不认识"`
}

// MeaningForReview is the data structure sent to the frontend for a learning session.
type MeaningForReview struct {
	MeaningID                  int     `json:"meaningId"`
	PartOfSpeech               string  `json:"partOfSpeech"`
	Definition                 string  `json:"definition"`
	ExampleSentence            string  `json:"exampleSentence"`
	ExampleSentenceTranslation *string `json:"exampleSentenceTranslation,omitempty"`
	Lemma                      string  `json:"lemma"`
	Word                       string  `json:"word"` // The actual word form in the sentence
}
