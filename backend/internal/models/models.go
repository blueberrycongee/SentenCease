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
	ID         int     `json:"id"`
	Lemma      string  `json:"lemma" binding:"required"`
	Source     string  `json:"source,omitempty"`
	Difficulty float64 `json:"difficulty"` // 单词难度参数，用于SSP-MMC算法
}

// Meaning represents a single definition and example for a word.
// It corresponds to the `meanings` table.
type Meaning struct {
	ID                         int     `json:"id"`
	WordID                     int     `json:"word_id"`
	PartOfSpeech               string  `json:"part_of_speech"`
	Definition                 string  `json:"definition"`
	ExampleSentence            string  `json:"example_sentence"`
	ExampleSentenceTranslation *string `json:"example_sentence_translation,omitempty"`
	Lemma                      string  `json:"lemma"` // Used for temporary association, not a DB field in meanings
	Unit                       string  `json:"unit,omitempty"`
	Difficulty                 float64 `json:"difficulty,omitempty"` // 用于SSP-MMC算法的单词难度
}

// ReviewHistoryEntry 记录复习历史的条目
type ReviewHistoryEntry struct {
	MeaningID int       `json:"meaningId"`
	Timestamp time.Time `json:"timestamp"`
	Stage     int       `json:"stage"`
}

// RecallHistoryEntry 记录回忆成功/失败历史的条目
type RecallHistoryEntry struct {
	MeaningID int       `json:"meaningId"`
	Timestamp time.Time `json:"timestamp"`
	Success   bool      `json:"success"`
}

// UserProgress represents the learning progress of a user for a specific meaning.
type UserProgress struct {
	UserID            uuid.UUID            `json:"-"`
	MeaningID         int                  `json:"-"`
	SRSStage          int                  `json:"srsStage"`
	LastReviewedAt    time.Time            `json:"lastReviewedAt,omitempty"`
	NextReviewAt      time.Time            `json:"nextReviewAt"`
	ReviewHistory     []ReviewHistoryEntry `json:"reviewHistory,omitempty"` // 复习历史时间
	RecallHistory     []RecallHistoryEntry `json:"recallHistory,omitempty"` // 复习历史结果
	ReviewCount       int                  `json:"reviewCount"`             // 总复习次数
	MemoryHalfLife    float64              `json:"memoryHalfLife"`          // 记忆半衰期，用于SSP-MMC
	OptimalInterval   float64              `json:"optimalInterval"`         // 最佳复习间隔
	LastRecallSuccess bool                 `json:"lastRecallSuccess"`       // 上次复习是否成功
}

// ReviewRequest is the structure for binding the request body of the POST /learn/review endpoint.
type ReviewRequest struct {
	MeaningID  int    `json:"meaningId" binding:"required"`
	UserChoice string `json:"userChoice" binding:"required,oneof=认识 模糊 不认识"`
}

// MeaningInfo represents a single, summarized meaning of a word.
type MeaningInfo struct {
	MeaningID    int    `json:"meaningId"`
	PartOfSpeech string `json:"partOfSpeech"`
	Definition   string `json:"definition"`
}

// WordReviewCard is the data structure sent to the frontend for a learning session.
// It contains the word, a context sentence, and all its associated meanings.
type WordReviewCard struct {
	ContextualMeaningID        int           `json:"contextualMeaningId"` // The specific meaning that triggered the review.
	WordID                     int           `json:"wordId"`
	Lemma                      string        `json:"lemma"`
	WordInSentence             string        `json:"wordInSentence"` // The actual word form in the sentence.
	ExampleSentence            string        `json:"exampleSentence"`
	ExampleSentenceTranslation *string       `json:"exampleSentenceTranslation,omitempty"`
	AllMeanings                []MeaningInfo `json:"allMeanings"`
}
