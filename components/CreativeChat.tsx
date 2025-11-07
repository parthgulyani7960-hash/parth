import React, { useState, useEffect, useRef } from 'react';
import { HistoryItem } from '../types';
import { generateText } from '../services/geminiService';
import Card from './common/Card';
import Button from './common/Button';
import Icon from './common/Icon';
import Spinner from './common/Spinner';

interface CreativeChatProps {
  addHistoryItem: (featureName: string, action: string, icon: HistoryItem['icon']) => void;
}

type Message = {
    role: 'user' | 'ai';
    content: string;
}

const CreativeChat: React.FC<CreativeChatProps> = ({ addHistoryItem }) => {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'ai', content: "Hello! I'm your creative partner. How can I help you brainstorm, write, or plan today?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const aiResponse = await generateText('chat', input, '', {});
            const aiMessage: Message = { role: 'ai', content: aiResponse };
            setMessages(prev => [...prev, aiMessage]);
            addHistoryItem('Creative Chat', 'Chatted with AI', 'chat');
        } catch (error) {
            const errorMessage: Message = { role: 'ai', content: "Sorry, I encountered an error. Please try again." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8 dark:text-slate-200">Creative Chat</h2>
            <Card className="!p-0">
                <div className="flex flex-col h-[70vh]">
                    <div className="flex-grow p-6 overflow-y-auto space-y-6">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                {msg.role === 'ai' && (
                                    <div className="w-8 h-8 flex-shrink-0 bg-brand-primary/20 text-brand-primary rounded-full flex items-center justify-center">
                                        <Icon name="sparkles" className="w-5 h-5" />
                                    </div>
                                )}
                                <div className={`max-w-md p-4 rounded-2xl ${msg.role === 'user' ? 'bg-brand-primary text-white rounded-br-none' : 'bg-slate-100 dark:bg-slate-700 text-brand-text dark:text-slate-200 rounded-bl-none'}`}>
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                </div>
                                 {msg.role === 'user' && (
                                    <div className="w-8 h-8 flex-shrink-0 bg-sky-200 text-sky-800 rounded-full flex items-center justify-center font-bold">
                                        JD
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 flex-shrink-0 bg-brand-primary/20 text-brand-primary rounded-full flex items-center justify-center">
                                    <Icon name="sparkles" className="w-5 h-5" />
                                </div>
                                <div className="max-w-md p-4 rounded-2xl bg-slate-100 dark:bg-slate-700 text-brand-text dark:text-slate-200 rounded-bl-none">
                                    <Spinner />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Ask me anything..."
                                className="w-full p-3 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl focus:ring-2 focus:ring-brand-primary focus:outline-none transition dark:text-slate-200 resize-none"
                                rows={1}
                            />
                            <Button onClick={handleSend} disabled={isLoading} className="!px-4 !py-3">
                                Send
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default CreativeChat;