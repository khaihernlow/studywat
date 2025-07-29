import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
  alert: { type: string; message: string }[];
}

interface ChatContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isLoadingHistory: boolean;
  setIsLoadingHistory: React.Dispatch<React.SetStateAction<boolean>>;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const { setClearChatCallback } = useAuth();

  const clearMessages = () => {
    setMessages([]);
    setIsLoadingHistory(false);
  };

  // Register the clearMessages callback with AuthContext
  useEffect(() => {
    setClearChatCallback(clearMessages);
  }, [setClearChatCallback]);

  return (
    <ChatContext.Provider value={{ messages, setMessages, isLoadingHistory, setIsLoadingHistory, clearMessages }}>
      {children}
    </ChatContext.Provider>
  );
}; 