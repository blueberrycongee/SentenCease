import React from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import Button from '../components/Button';

const HomePage = () => {
    return (
        <div className="container mx-auto text-center p-8">
            <h1 className="text-4xl font-bold mb-4">欢迎来到 Sentencease</h1>
            <p className="text-lg mb-8">一个通过例句学习英语单词的应用。</p>
            <div className="space-x-4">
                <Link to="/select-words" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    选择今日单词
                </Link>
                <Link to="/learn" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                    开始学习
                </Link>
            </div>
        </div>
    );
};

export default HomePage; 