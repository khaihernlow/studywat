import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

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

  return (
    <ChatContext.Provider value={{ messages, setMessages, isLoadingHistory, setIsLoadingHistory }}>
      {children}
    </ChatContext.Provider>
  );
}; 