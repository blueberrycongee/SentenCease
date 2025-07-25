# Stage 1: Build the Go application
FROM golang:1.23-alpine AS builder

# Set the working directory
WORKDIR /app

# Install git
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories && \
    apk add --no-cache git

# Copy the Go module files
COPY backend/go.mod ./
COPY backend/go.sum ./
# Download all dependencies. Dependencies will be cached if the go.mod and go.sum files are not changed
ENV GOPROXY=https://goproxy.cn,direct
RUN go mod download

# Copy the source code
COPY backend/ ./

# Build the Go app
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

# Stage 2: Create a lightweight final image
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the pre-built binary from the builder stage
COPY --from=builder /app/main .

# Expose port 8080 to the outside world
EXPOSE 8080

# Command to run the executable
CMD ["./main"] 