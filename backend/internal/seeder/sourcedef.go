package seeder

// KaoYanWord represents the true structure of a word object in the KaoYan JSON files.
type KaoYanWord struct {
	Word         string `json:"word"`
	Unit         string `json:"unit,omitempty"`
	Translations []struct {
		Translation string `json:"translation"`
		Type        string `json:"type"`
	} `json:"translations"`
	Sentences []struct {
		Sentence    string `json:"sentence"`
		Translation string `json:"translation"`
	} `json:"sentences"`
}
