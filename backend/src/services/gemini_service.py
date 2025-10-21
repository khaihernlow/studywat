import os
from google import genai
from typing import List
from ..core.config import settings
import asyncio
import threading
import queue
import logging
logger = logging.getLogger(__name__)


class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        self.client = genai.Client(api_key=self.api_key)

    async def generate_response(self, conversation_history: List[dict]) -> str:
        """
        Generate a response from Gemini based on conversation history.
        
        Args:
            conversation_history: List of messages with 'role' and 'content'
            
        Returns:
            Generated response from Gemini
        """
        try:
            # Build the conversation context with a system prompt
            system_prompt = """You are a helpful study advisor."""
            
            conversation_text = f"System: {system_prompt}\n\n"
            for message in conversation_history:
                role = message["role"]
                content = message["content"]
                conversation_text += f"{role}: {content}\n"
            
            # Generate response using the simple approach
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=conversation_text
                )
            )
            
            return response.text
            
        except Exception as e:
            logger.error(f"Error generating Gemini response: {e}")
            return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment." 

    async def stream_response(self, contents: list[str]):
        """
        Stream a response from Gemini using the official streaming API.
        Args:
            contents: List of strings (conversation turns or prompts)
        Yields:
            Each chunk's text as it arrives
        """
        q = queue.Queue()

        def run_stream():
            try:
                response = self.client.models.generate_content_stream(
                    model="gemini-2.5-flash",
                    contents=contents
                )
                for chunk in response:
                    logger.debug(f"[GEMINI CHUNK] {repr(chunk.text)}")
                    q.put(chunk.text)
            except Exception as e:
                logger.error(f"Error streaming Gemini response: {e}")
                q.put("[Error: Unable to stream response]")
            finally:
                q.put(None)  # Sentinel

        threading.Thread(target=run_stream, daemon=True).start()

        loop = asyncio.get_event_loop()
        while True:
            text = await loop.run_in_executor(None, q.get)
            if text is None:
                break
            yield text 