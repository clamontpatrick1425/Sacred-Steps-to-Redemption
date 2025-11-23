
import React, { useState, useRef, useEffect } from 'react';
import type { Chat } from '@google/genai';
import type { ChatMessage } from '../types';

interface SpiritualGuideChatProps {
    isOpen: boolean;
    onClose: () => void;
    chat: Chat | null;
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    onClear: () => void;
    currentTheme?: string;
}

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h14" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);


export const SpiritualGuideChat: React.FC<SpiritualGuideChatProps> = ({ isOpen, onClose, chat, messages, setMessages, onClear, currentTheme }) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSend = async (messageText: string) => {
        if (!messageText.trim() || !chat || isLoading) return;
        
        const text = messageText.trim();
        setInput('');
        setIsLoading(true);

        const userMessage: ChatMessage = { id: Date.now(), role: 'user', text };
        setMessages(prev => [...prev, userMessage]);

        const modelMessageId = Date.now() + 1;
        setMessages(prev => [...prev, { id: modelMessageId, role: 'model', text: '' }]);

        try {
            const stream = await chat.sendMessageStream({ message: text });
            
            for await (const chunk of stream) {
                const chunkText = chunk.text;
                 setMessages(prev => prev.map(msg => 
                    msg.id === modelMessageId ? { ...msg, text: msg.text + chunkText } : msg
                ));
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => prev.map(msg => 
                msg.id === modelMessageId ? { ...msg, text: "I'm sorry, I encountered an error. Please try again." } : msg
            ));
        } finally {
            setIsLoading(false);
        }
    };
    
    const quickSuggestionClick = (suggestion: string) => {
        handleSend(suggestion);
    }

    if (!isOpen) return null;

    return (
        <div className="no-print fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-card rounded-lg shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-fade-in">
                <header className="flex items-center justify-between p-4 border-b border-default">
                    <h3 className="text-xl font-semibold text-main">Chat with Kairos</h3>
                    <div className="flex items-center space-x-2">
                        <button onClick={onClear} className="text-muted hover:text-main transition-colors p-2 rounded-full hover:bg-card-secondary" aria-label="Clear conversation" title="Clear conversation">
                           <TrashIcon />
                        </button>
                        <button onClick={onClose} className="text-muted hover:text-main transition-colors" aria-label="Close chat">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </header>

                <div className="flex-1 p-4 overflow-y-auto bg-card-secondary space-y-4">
                    {messages.map((message) => (
                        <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${message.role === 'user' ? 'bg-primary text-on-primary' : 'bg-card shadow-sm'}`}>
                                <p className="whitespace-pre-wrap">{message.text}{message.id === messages[messages.length - 1].id && isLoading && message.role === 'model' && <span className="inline-block w-2 h-4 bg-main ml-1 animate-pulse"></span>}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                 {messages.length <= 1 && currentTheme && (
                    <div className="p-4 border-t border-default text-sm">
                        <p className="text-muted mb-2">Suggested prompts for this week's theme of '{currentTheme}':</p>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => quickSuggestionClick(`Can you explain the theme of '${currentTheme}' a bit more?`)} className="px-3 py-1 bg-card-secondary text-primary-on-light rounded-full text-xs hover:bg-primary-light transition-colors">Explain this theme</button>
                            <button onClick={() => quickSuggestionClick(`How does '${currentTheme}' relate to my recovery journey?`)} className="px-3 py-1 bg-card-secondary text-primary-on-light rounded-full text-xs hover:bg-primary-light transition-colors">Relate to recovery</button>
                        </div>
                    </div>
                )}


                <footer className="p-4 border-t border-default">
                    <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-grow text-base p-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                            placeholder="Ask a question..."
                            aria-label="Your message to Kairos"
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading || !input.trim()} className="p-3 bg-primary text-on-primary rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary disabled:opacity-50 disabled:cursor-not-allowed">
                            {isLoading ? (
                                 <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : <SendIcon />}
                        </button>
                    </form>
                </footer>
            </div>
        </div>
    );
};