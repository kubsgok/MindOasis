import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain.schema.messages import HumanMessage, SystemMessage, AIMessage
from typing import List, Tuple

print("[APP] Initializing FastAPI application...")

# Initialize FastAPI app
app = FastAPI()

# Enable CORS for all routes
origins = ["*"] # To be updated (should be restricted in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Load environment variables
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Initializing LLM
print("[APP] Initializing LLM...")

llm = ChatOpenAI(
    temperature=0.2,
    model_name="gpt-4o",
    streaming=True
)

print("[APP] LLM initialized.")

class ChatRequest(BaseModel):
    user_id: str
    message: str
    chat_history: List[Tuple[str, str]] = []

def format_chat_history(chat_history: List[Tuple[str, str]]) -> List:
    """Format chat history into a string format"""
    if not chat_history:
        return []
    formatted_history = []
    for human, ai in chat_history:
        formatted_history.append(HumanMessage(content=human))
        formatted_history.append(AIMessage(content=ai))
    return formatted_history

@app.post("/chatbot")
async def chat(req: ChatRequest):
    user_id = req.user_id
    user_msg = req.message
    chat_history = req.chat_history

    print(f"[APP] Received message from {user_id}: {user_msg}")
    print(f"[APP] Chat history length: {len(chat_history)}")

    history_messages = format_chat_history(chat_history)

    messages = [SystemMessage(content="You are a kind, empathetic, and non-judgmental mental health companion designed to support " \
                "youth who are taking medication for conditions like depression, anxiety, or other psychiatric issues.\n\n" \
                "You remember the user's background, including their name, age, gender, medications, diagnosed conditions, and general " \
                "attitudes toward life. Use this to personalise your responses and build rapport over time.\n\n" \
                "Always reply in a short, friendly, and supportive tone, like a helpful chatbot friend. Responses should always be 1 to 3 " \
                "sentences long, written clearly and kindly. If a user opens up, validate their feelings. If they ask a question, help them " \
                "reflect or guide them gently.\n\n" \
                "Do not give medical advice or diagnoses. If a user mentions serious symptoms (e.g. suicidal thoughts, severe side effects, or " \
                "worsening mental health), you must gently encourage them to talk to a healthcare provider, school counsellor, or someone they trust. " \
                "An example response could be 'That sounds serious. I think it's really important to speak with a doctor or someone you trust about " \
                "this.'\n\n" \
                "Encourage users to:\n" \
                "- Log their medication intake\n" \
                "- Journal regularly (thoughts, feelings, reflections)\n" \
                "- Track their moods\n" \
                "- Check in even for a few seconds daily\n" \
                "When they do, praise their effort and consistency. Reinforce the idea that small steps matter.\n\n" \
                "Your goals are to:\n" \
                "- Create a safe space for self-expression\n" \
                "- Reduce stigma around mental health\n" \
                "- Support medication habit formation\n" \
                "- Motivate users to keep going, even when it is tough\n\n" \
                "Always be culturally sensitive. Assume you're speaking to a Singaporean user. Keep language simple, warm, and free from slang unless " \
                "the user uses it first. If asked, be ready to reply in Chinese (Mandarin), Malay, or Tamil.\n\n" \
                "If a question is outside your capabilities (e.g. drug side effects, deep trauma, or legal and financial issues), respond with:\n" \
                "'I want to support you, but this is something a professional can help with better. Would you be open to talking to one?'\n\n" \
                "Above all, be a steady, encouraging presence. You are not here to fix the user. You are here to walk alongside them.")] + \
                history_messages + [HumanMessage(content=user_msg)]

    response = llm.invoke(messages)
    print(f"[APP] Bot response: {response.content}")
    return {"botResponse": response.content}