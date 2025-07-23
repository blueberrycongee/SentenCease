# Task: Fix Bug Where New Users Have No Words to Learn

## 1. Project Context

-   **Application**: "句读 (SentenCease)" is a full-stack web application for contextual vocabulary learning.
-   **Tech Stack**: Go (Gin) for the backend API, React (Vite) for the frontend, and PostgreSQL for the database.
-   **Environment**: The entire project is containerized using Docker and Docker Compose, featuring a hot-reloading development setup for the frontend.

## 2. Current Status

We have successfully implemented the following:
-   A complete backend API with user registration and JWT-based authentication.
-   A fully functional frontend with user registration and login flows.
-   A protected `/learn` route that displays the core learning interface.
-   A mechanism for the database to auto-initialize its schema and seed data on first launch.

## 3. The Bug

After a user successfully registers and logs in for the very first time, they are correctly redirected to the `/learn` page. However, instead of being presented with their first new word, the UI immediately displays the message: **"Congratulations! You have learned all available words."**

This is incorrect. A new user should be presented with a word from the seeded database.

## 4. Suspected Cause

The issue almost certainly lies in the backend's word selection logic. The frontend is correctly calling the `/api/learn/next` endpoint, but the API is returning the "all words learned" message instead of a new word.

The primary suspect is the `GetNextWordForReview` function located in `backend/internal/srs/srs.go`. The logic for fetching a new word for a user with no existing records in the `user_progress` table appears to be flawed. The SQL query designed to find a word the user has "never seen" might be failing or returning no rows incorrectly.

## 5. Objective

Your mission is to:
1.  **Investigate** the logic in `backend/internal/srs/srs.go`, specifically the `GetNextWordForReview` function.
2.  **Analyze** the SQL queries to understand why they fail to return a new word for a newly registered user.
3.  **Fix** the Go code and/or the SQL query to ensure that a new user is correctly served their first word.
4.  **Verify** the fix by registering a new user and confirming that the learning page displays a word correctly. 