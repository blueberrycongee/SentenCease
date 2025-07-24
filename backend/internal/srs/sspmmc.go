package srs

import (
	"math"
	"time"

	"sentencease/backend/internal/models"
)

// DHP模型参数 (Difficulty, History, Person)
// 这些参数是根据墨墨背单词的论文提供的
// 实际使用时应根据您的用户数据进行拟合
var (
	// 记忆保留概率模型参数
	dhpIntercept      = -0.5 // 截距
	dhpDifficulty     = 1.2  // 难度系数
	dhpHistorySuccess = 0.2  // 历史成功记忆次数系数
	dhpHistoryFail    = 0.1  // 历史失败记忆次数系数
	dhpLogHalflife    = 0.5  // 对数半衰期系数

	// 最佳间隔计算参数
	minInterval       = 4.0   // 最小间隔时间（小时）
	maxInterval       = 720.0 // 最大间隔时间（小时）
	defaultDifficulty = 0.5   // 默认单词难度
	targetRecall      = 0.9   // 目标记忆保留率（90%）
)

// 计算记忆半衰期（单位：小时）
// 实现DHP模型预测记忆保留
func calculateMemoryHalflife(
	difficulty float64,
	successCount int,
	failCount int,
	previousHalflife float64) float64 {

	// 如果是首次学习，返回默认值
	if successCount == 0 && failCount == 0 {
		return minInterval
	}

	// 计算难度因子
	difficultyFactor := 1.0
	if difficulty > 0 {
		difficultyFactor = math.Exp(dhpDifficulty * difficulty)
	}

	// 计算历史因子
	historyFactor := math.Exp(dhpHistorySuccess*float64(successCount) -
		dhpHistoryFail*float64(failCount))

	// 计算半衰期因子
	halflifeFactor := 1.0
	if previousHalflife > 0 {
		halflifeFactor = math.Exp(dhpLogHalflife * math.Log(previousHalflife))
	}

	// 组合所有因子计算半衰期
	halflife := math.Exp(dhpIntercept) * difficultyFactor * historyFactor * halflifeFactor

	// 限制在最小和最大值之间
	return math.Min(math.Max(halflife, minInterval), maxInterval)
}

// 计算记忆保留概率
// 使用Ebbinghaus遗忘曲线公式：p(t) = 2^(-t/h)
// t是经过的时间，h是半衰期
func calculateRecallProbability(elapsedTime float64, halflife float64) float64 {
	if halflife <= 0 {
		return 0.0
	}
	return math.Pow(2, -elapsedTime/halflife)
}

// 计算最佳复习间隔（小时）
// 使用SSP-MMC算法的优化公式
func calculateOptimalInterval(halflife float64) float64 {
	// 使用目标记忆保留率来计算最佳间隔
	// 反向计算：t = -h * log2(p)，其中p是目标保留率
	optimalInterval := -halflife * math.Log2(targetRecall)

	// 限制在合理范围内
	return math.Min(math.Max(optimalInterval, minInterval), maxInterval)
}

// 更新用户进度
func UpdateProgressWithSSPMMC(progress *models.UserProgress, meaning *models.Meaning, userChoice string) {
	// 将用户选择转换为布尔值表示记忆是否成功
	recallSuccess := userChoice == "认识"
	partialSuccess := userChoice == "模糊"

	// 更新复习历史（如果历史为nil则初始化）
	if progress.ReviewHistory == nil {
		progress.ReviewHistory = make([]models.ReviewHistoryEntry, 0)
		progress.RecallHistory = make([]models.RecallHistoryEntry, 0)
	}

	// 添加本次复习记录
	progress.ReviewHistory = append(progress.ReviewHistory, models.ReviewHistoryEntry{
		MeaningID: progress.MeaningID,
		Timestamp: time.Now(),
		Stage:     progress.SRSStage,
	})

	progress.RecallHistory = append(progress.RecallHistory, models.RecallHistoryEntry{
		MeaningID: progress.MeaningID,
		Timestamp: time.Now(),
		Success:   recallSuccess,
	})

	progress.ReviewCount++

	// 计算成功和失败的复习次数
	successCount := 0
	failCount := 0
	for _, entry := range progress.RecallHistory {
		if entry.Success {
			successCount++
		} else {
			failCount++
		}
	}

	// 获取单词难度，如果没有设置则使用默认值
	difficulty := meaning.Difficulty
	if difficulty == 0 {
		difficulty = defaultDifficulty
	}

	// 计算新的记忆半衰期
	newHalflife := calculateMemoryHalflife(
		difficulty,
		successCount,
		failCount,
		progress.MemoryHalfLife,
	)

	// 如果是模糊记忆，我们降低半衰期
	if partialSuccess {
		newHalflife = newHalflife * 0.8
	}

	// 更新记忆模型参数
	progress.MemoryHalfLife = newHalflife
	progress.LastRecallSuccess = recallSuccess

	// 计算最佳复习间隔
	optimalInterval := calculateOptimalInterval(newHalflife)
	progress.OptimalInterval = optimalInterval

	// 更新下次复习时间
	// 如果记忆成功，使用计算的最佳间隔
	// 如果记忆失败，我们采用快速复习策略
	if recallSuccess {
		progress.NextReviewAt = time.Now().Add(time.Duration(optimalInterval * float64(time.Hour)))
	} else {
		// 记忆失败时使用较短的间隔（例如25%的最佳间隔）
		shortInterval := math.Max(minInterval, optimalInterval*0.25)
		progress.NextReviewAt = time.Now().Add(time.Duration(shortInterval * float64(time.Hour)))
	}

	// 更新SRS阶段（向后兼容）
	if recallSuccess {
		progress.SRSStage++
	} else if partialSuccess {
		// 模糊记忆不变或轻微降低
		if progress.SRSStage > 0 {
			progress.SRSStage--
		}
	} else {
		// 完全不记得，重置阶段
		progress.SRSStage = 0
	}
}

// 获取SSP-MMC算法的介绍信息
func GetSSPMMCInfo() string {
	return `SSP-MMC (Stochastic-Shortest-Path-Minimize-Memorization-Cost) 是由墨墨背单词开发的
一种优化间隔重复算法，基于随机最短路径最小化记忆成本的方法，通过DHP模型预测记忆概率，
动态调整复习间隔以最大化记忆效率。该算法已在ACM SIGKDD 2022上发表，并在墨墨背单词上得到了应用。`
}
