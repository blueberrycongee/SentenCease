package models

// User represents a user in the system.
// Note: Password field is for binding request data and is not stored in the database.
// PasswordHash is what's stored in the database.
type User struct {
	ID           string `json:"id"`
	Email        string `json:"email" binding:"required,email"`
	Password     string `json:"password,omitempty" binding:"required,min=8"`
	PasswordHash string `json:"-"` // Do not expose hash in JSON responses
}
