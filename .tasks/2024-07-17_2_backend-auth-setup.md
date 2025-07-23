# Task: Phase 2 - Environment Setup & Backend User Authentication

## 1. Overview
This task marks the second phase of the "SentenCease" project. Building upon the initial project structure, the objective is to establish a runnable development environment and implement the core user authentication system. This involves setting up a database service using Docker, managing application configuration, and developing the backend endpoints for user registration and login. Completing this phase is a critical prerequisite for all subsequent feature development.

## 2. Part 1: Development Environment Setup (DevOps)

### Objective
Create a consistent, isolated, and reproducible development environment for the PostgreSQL database using Docker and Docker Compose. This ensures that all developers work with the same database version and configuration, avoiding "it works on my machine" issues.

### Implementation Checklist
1.  **Create `docker-compose.yml`**:
    -   In the project root, create a file named `docker-compose.yml`.
    -   Define a service named `postgres`.
    -   Use the official `postgres:15-alpine` image for a lightweight and modern version.
    -   Set `restart: always` to ensure the service automatically restarts if it crashes.
    -   Use an `.env` file to source environment variables for the database credentials (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`). This keeps secrets out of version control.
    -   Map a local data volume (e.g., `./.postgres-data:/var/lib/postgresql/data`) to persist database data across container restarts.
    -   Map the host port `5432` to the container port `5432` to allow the Go application to connect to the database.

2.  **Create `.env` Configuration File**:
    -   In the project root, create a file named `.env`.
    -   Define the following key-value pairs (use your own secure values):
        ```
        POSTGRES_USER=user
        POSTGRES_PASSWORD=password
        POSTGRES_DB=sentencease
        DATABASE_URL="postgres://user:password@localhost:5432/sentencease?sslmode=disable"
        JWT_SECRET_KEY="your-super-secret-key"
        ```

3.  **Update `.gitignore`**:
    -   Add the following lines to the `.gitignore` file to ensure sensitive information and local data are not committed to version control:
        ```
        .env
        .postgres-data/
        ```

## 3. Part 2: Backend Implementation (Go)

### Objective
Develop the API endpoints (`/register`, `/login`) and all necessary underlying logic for user authentication, including password hashing, database interaction, and JWT generation.

### Implementation Checklist
1.  **Add Go Dependencies**:
    -   Navigate to the `backend` directory in your terminal.
    -   Run `go get` to install the following modules:
        -   `github.com/gin-gonic/gin` (Web framework)
        -   `github.com/jackc/pgx/v5/pgxpool` (PostgreSQL driver)
        -   `golang.org/x/crypto/bcrypt` (For password hashing)
        -   `github.com/golang-jwt/jwt/v5` (For JWTs)
        -   `github.com/joho/godotenv` (To load the `.env` file)

2.  **Implement Configuration Loading (`internal/config/config.go`)**:
    -   Create a function `LoadConfig()` that reads the `.env` file and populates a struct containing the `DATABASE_URL` and `JWT_SECRET_KEY`.

3.  **Implement Database Connection (`internal/database/database.go`)**:
    -   Create a function `ConnectDatabase(dbURL string)` that establishes a connection pool to PostgreSQL and returns it. Handle any connection errors.

4.  **Implement Authentication Logic (`internal/auth/auth.go`)**:
    -   Create `HashPassword(password string)` which returns a bcrypt hash.
    -   Create `CheckPasswordHash(password, hash string)` which compares a password to a hash.
    -   Create `GenerateJWT(userID string)` which generates a signed JWT string.

5.  **Implement API Handlers (`internal/api/handlers.go`)**:
    -   Refactor to have a `Handler` struct that holds a reference to the database connection pool.
    -   Implement `Register(c *gin.Context)`:
        -   Binds the JSON request body to a user struct.
        -   Hashes the user's password.
        -   Saves the new user to the `users` table.
        -   Returns a success or error response.
    -   Implement `Login(c *gin.Context)`:
        -   Binds the JSON request body.
        -   Finds the user by email in the database.
        -   Verifies the password.
        -   Generates a JWT and returns it in the response if successful.

6.  **Assemble the Server (`cmd/server/main.go`)**:
    -   In the `main` function:
        -   Load the configuration.
        -   Connect to the database.
        -   Initialize the Gin router.
        -   Create an instance of the API handlers.
        -   Define the `POST /api/auth/register` and `POST /api/auth/login` routes.
        -   Start the server.

---
This structured prompt provides a complete roadmap for the next development phase. 