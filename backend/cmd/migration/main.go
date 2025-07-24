package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"sentencease/backend/internal/config"
	"sentencease/backend/internal/database"
)

func main() {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// 连接到数据库
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	ctx := context.Background()

	// 读取迁移文件内容
	migrationSQL, err := os.ReadFile("db/migrations/0005_add_sspmmc_support.sql")
	if err != nil {
		log.Fatalf("Failed to read migration file: %v", err)
	}

	// 执行迁移
	_, err = db.Exec(ctx, string(migrationSQL))
	if err != nil {
		log.Fatalf("Failed to execute migration: %v", err)
	}

	fmt.Println("Migration completed successfully!")

	// 为现有单词设置默认难度值
	_, err = db.Exec(ctx, `
		UPDATE words SET difficulty = 0.5 WHERE difficulty IS NULL;
		UPDATE meanings SET difficulty = 0.5 WHERE difficulty IS NULL;
	`)
	if err != nil {
		log.Fatalf("Failed to set default difficulty: %v", err)
	}

	fmt.Println("Default difficulty values set for existing words!")
}
