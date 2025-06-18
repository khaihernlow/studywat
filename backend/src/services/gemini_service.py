import os
from google import genai
from google.genai import types
from typing import Dict, List


class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        self.client = genai.Client(api_key=self.api_key)
        # Store chat sessions for each user
        self.chat_sessions: Dict[str, genai.Chat] = {}

    async def generate_response(self, user_message: str, user_id: str) -> str:
        """
        Generate a response from Gemini based on the user's message.
        Maintains conversation history for each user.
        
        Args:
            user_message: The message from the user
            user_id: User identifier to maintain conversation history
            
        Returns:
            Generated response from Gemini
        """
        try:
            # Get or create chat session for this user
            if user_id not in self.chat_sessions:
                self.chat_sessions[user_id] = self.client.chats.create(
                    model="gemini-2.0-flash"
                )
            
            chat = self.chat_sessions[user_id]
            
            # Send message and get response
            response = chat.send_message(user_message)
            return response.text
            
        except Exception as e:
            print(f"Error generating Gemini response: {e}")
            return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment."

    def get_chat_history(self, user_id: str) -> List[dict]:
        """
        Get chat history for a specific user.
        
        Args:
            user_id: User identifier
            
        Returns:
            List of chat messages with role and content
        """
        try:
            if user_id not in self.chat_sessions:
                return []
            
            chat = self.chat_sessions[user_id]
            history = []
            
            for message in chat.get_history():
                history.append({
                    "role": message.role,
                    "content": message.parts[0].text
                })
            
            return history
            
        except Exception as e:
            print(f"Error getting chat history: {e}")
            return []

    def clear_chat_session(self, user_id: str) -> bool:
        """
        Clear chat session for a specific user.
        
        Args:
            user_id: User identifier
            
        Returns:
            True if session was cleared, False if not found
        """
        if user_id in self.chat_sessions:
            del self.chat_sessions[user_id]
            return True
        return False 