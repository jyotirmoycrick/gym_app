# ai_utils.py
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()


# Initialize client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class GPTChat:
    def __init__(self, system_message="You are FitDesert AI, a professional fitness assistant."):
        self.system_message = system_message

    async def send_message(self, user_message: str):
        """
        Send a message to GPT-5 (or GPT-4 if not available yet).
        """
        try:
            response = client.chat.completions.create(
                model="gpt-5",  # or "gpt-4o-mini" if gpt-5 not yet deployed
                messages=[
                    {"role": "system", "content": self.system_message},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.8,
                max_tokens=400
            )
            return response.choices[0].message.content.strip()

        except Exception as e:
            print("GPT error:", e)
            return "⚠️ AI assistant unavailable right now."
