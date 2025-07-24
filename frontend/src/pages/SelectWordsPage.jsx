import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const SelectWordsPage = () => {
    const [vocabSources, setVocabSources] = useState([]);
    const [selectedSource, setSelectedSource] = useState('');
    const [wordsByUnit, setWordsByUnit] = useState({});
    const [selectedWords, setSelectedWords] = useState(new Set());
    const [dailyGoal, setDailyGoal] = useState(100);
    const [wordCount, setWordCount] = useState(10);
    const [order, setOrder] = useState('sequential');
    const [fetchedWords, setFetchedWords] = useState([]);

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

    const handleFetchWords = async () => {
        if (!selectedSource) {
            alert('Please select a vocabulary source first.');
            return;
        }
        try {
            const response = await api.get('/words/selection', {
                params: {
                    source: selectedSource,
                    count: wordCount,
                    order: order,
                },
            });
            setFetchedWords(response.data);
            // Reset selection when new words are fetched
            setSelectedWords(new Set());
        } catch (error) {
            console.error('Failed to fetch words for selection:', error);
        }
    };

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

    const handleSelectAllFetched = () => {
        const allWordIds = new Set(fetchedWords.map(w => w.id));
        setSelectedWords(allWordIds);
    };

    // 添加根据每日目标数量选择单词的函数
    const handleSelectByGoal = () => {
        if (fetchedWords.length === 0) {
            alert('请先获取单词列表');
            return;
        }
        
        // 限制选择的单词数量不超过每日目标
        const wordsToSelect = fetchedWords.slice(0, dailyGoal);
        const wordIds = new Set(wordsToSelect.map(w => w.id));
        setSelectedWords(wordIds);
        
        // 如果获取的单词不足，提示用户
        if (wordsToSelect.length < dailyGoal) {
            alert(`当前只获取了${wordsToSelect.length}个单词，少于每日目标${dailyGoal}个。可以增加每次加载数量后重新获取。`);
        }
    };

    const handleStartLearning = async () => {
        if (selectedWords.size === 0) {
            alert('请选择需要学习的单词。');
            return;
        }
        
        if (selectedWords.size < dailyGoal) {
            if (!confirm(`您选择了${selectedWords.size}个单词，少于设定的目标${dailyGoal}个。确定开始学习吗？`)) {
                return;
            }
        } else if (selectedWords.size > dailyGoal) {
            if (!confirm(`您选择了${selectedWords.size}个单词，超过设定的目标${dailyGoal}个。确定全部加入学习计划吗？`)) {
                return;
            }
        }
        
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
                    onChange={(e) => {
                        setSelectedSource(e.target.value);
                        setFetchedWords([]); // Clear fetched words when source changes
                        setSelectedWords(new Set());
                    }}
                    className="p-2 border rounded dark:bg-gray-700"
                >
                    <option value="">-- 请选择 --</option>
                    {vocabSources.map(source => (
                        <option key={source} value={source}>{source}</option>
                    ))}
                </select>
            </div>

            {/* Custom selection controls */}
            <div className="mb-4 p-4 border rounded dark:border-gray-600">
                <h2 className="text-xl mb-2">自定义今日学习</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="daily-goal" className="block mb-1">今日学习目标 (单词数):</label>
                        <input
                            type="number"
                            id="daily-goal"
                            value={dailyGoal}
                            onChange={(e) => setDailyGoal(parseInt(e.target.value, 10))}
                            min="1"
                            className="p-2 border rounded dark:bg-gray-700 w-full"
                        />
                    </div>
                    <div>
                        <label htmlFor="word-count" className="block mb-1">每次加载单词数量:</label>
                        <input
                            type="number"
                            id="word-count"
                            value={wordCount}
                            onChange={(e) => setWordCount(parseInt(e.target.value, 10))}
                            min="1"
                            className="p-2 border rounded dark:bg-gray-700 w-full"
                        />
                    </div>
                </div>

                <div className="mt-4">
                    <label className="block mb-1">选择方式:</label>
                    <div className="flex space-x-2">
                        <button onClick={() => setOrder('sequential')} className={`px-4 py-2 rounded ${order === 'sequential' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>顺选</button>
                        <button onClick={() => setOrder('random')} className={`px-4 py-2 rounded ${order === 'random' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>随机选</button>
                    </div>
                </div>

                <div className="mt-4">
                    <button onClick={handleFetchWords} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                        获取单词
                    </button>
                </div>
            </div>

            {/* Word List */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl">单词列表 ({selectedWords.size} selected)</h2>
                    <div className="flex items-center gap-2">
                        <div className="text-sm text-gray-500">
                            计划学习: {dailyGoal} 单词
                        </div>
                        <button
                            onClick={handleStartLearning}
                            disabled={selectedWords.size === 0}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
                        >
                            开始学习
                        </button>
                    </div>
                </div>

                {fetchedWords.length > 0 && (
                    <div className="mb-4">
                        <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded-t">
                            <h3 className="font-bold">自定义选择</h3>
                            <div className="flex space-x-2">
                                <button
                                    onClick={handleSelectByGoal}
                                    className="text-sm bg-blue-500 text-white px-3 py-1 rounded"
                                >
                                    选择目标数量({dailyGoal})
                                </button>
                                <button
                                    onClick={handleSelectAllFetched}
                                    className="text-sm text-blue-500 hover:underline"
                                >
                                    全选
                                </button>
                            </div>
                        </div>
                        <ul className="list-none p-2 border rounded-b dark:border-gray-600">
                            {fetchedWords.map(word => (
                                 <li key={word.id} className={`flex items-center justify-between py-2 px-3 rounded ${selectedWords.has(word.id) ? 'bg-blue-100 dark:bg-blue-900' : ''}`}>
                                     <div>
                                         <span className="font-semibold">{word.lemma}</span>
                                         <p className="text-sm text-gray-500 dark:text-gray-400">{word.definition}</p>
                                     </div>
                                     <input
                                         type="checkbox"
                                         checked={selectedWords.has(word.id)}
                                         onChange={() => handleWordSelection(word.id)}
                                         className="form-checkbox h-5 w-5 text-blue-600 rounded dark:bg-gray-700 border-gray-300 dark:border-gray-500 focus:ring-blue-500"
                                     />
                                 </li>
                             ))}
                         </ul>
                     </div>
                )}
            </div>
        </div>
    );
};

export default SelectWordsPage; 