import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const SelectWordsPage = () => {
    const [vocabSources, setVocabSources] = useState([]);
    const [selectedSource, setSelectedSource] = useState('');
    const [wordsByUnit, setWordsByUnit] = useState({});
    const [selectedWords, setSelectedWords] = useState(new Set());
    const [dailyGoal, setDailyGoal] = useState(20);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSources = async () => {
            try {
                const response = await api.get('/vocab-sources');
                setVocabSources(response.data);
            } catch (error) {
                console.error('Failed to fetch vocab sources:', error);
            }
        };
        fetchSources();
    }, []);

    useEffect(() => {
        if (selectedSource) {
            const fetchWords = async () => {
                try {
                    const response = await api.get(`/vocab-sources/${selectedSource}/words`);
                    setWordsByUnit(response.data);
                } catch (error) {
                    console.error(`Failed to fetch words for ${selectedSource}:`, error);
                }
            };
            fetchWords();
        }
    }, [selectedSource]);

    const handleWordSelection = (wordId) => {
        setSelectedWords(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(wordId)) {
                newSelection.delete(wordId);
            } else {
                newSelection.add(wordId);
            }
            return newSelection;
        });
    };

    const handleSelectAllInUnit = (unit) => {
        const unitWordIds = wordsByUnit[unit].map(w => w.id);
        setSelectedWords(prev => {
            const newSelection = new Set(prev);
            unitWordIds.forEach(id => newSelection.add(id));
            return newSelection;
        });
    };

    const handleStartLearning = async () => {
        try {
            const meaningIds = Array.from(selectedWords);
            await api.post('/daily-plan', { meaning_ids: meaningIds });
            navigate('/learn');
        } catch (error) {
            console.error('Failed to create daily plan:', error);
        }
    };

    return (
        <div className="container mx-auto p-4 dark:bg-gray-800 dark:text-white">
            <h1 className="text-2xl font-bold mb-4">选择你的单词</h1>

            {/* Source Selection */}
            <div className="mb-4">
                <label htmlFor="source-select" className="block mb-2">选择词书:</label>
                <select
                    id="source-select"
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="p-2 border rounded dark:bg-gray-700"
                >
                    <option value="">-- 请选择 --</option>
                    {vocabSources.map(source => (
                        <option key={source} value={source}>{source}</option>
                    ))}
                </select>
            </div>

            {/* Word List */}
            {selectedSource && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl">单词列表 ({selectedWords.size} / {dailyGoal})</h2>
                        <button
                            onClick={handleStartLearning}
                            disabled={selectedWords.size === 0}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
                        >
                            开始学习
                        </button>
                    </div>

                    {Object.entries(wordsByUnit).map(([unit, words]) => (
                        <div key={unit} className="mb-4">
                            <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded-t">
                                <h3 className="font-bold">{unit}</h3>
                                <button
                                    onClick={() => handleSelectAllInUnit(unit)}
                                    className="text-sm text-blue-500 hover:underline"
                                >
                                    全选
                                </button>
                            </div>
                            <ul className="list-disc pl-5 p-2 border rounded-b">
                                {words.map(word => (
                                    <li key={word.id} className="flex items-center justify-between py-1">
                                        <span>{word.lemma}</span>
                                        <input
                                            type="checkbox"
                                            checked={selectedWords.has(word.id)}
                                            onChange={() => handleWordSelection(word.id)}
                                            className="form-checkbox h-5 w-5 text-blue-600"
                                        />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SelectWordsPage; 