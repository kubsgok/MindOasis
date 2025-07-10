import os
import io
import pytesseract
import json
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain.schema.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain.output_parsers.json import SimpleJsonOutputParser
from typing import List, Tuple
from PIL import Image

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
TESSERACT_PATH = os.getenv("TESSERACT_PATH")

# Initializing LLM
print("[APP] Initializing LLM...")

llm = ChatOpenAI(
    temperature=0.2,
    model_name="gpt-4o"
)

print("[APP] LLM initialized.")

""" Chatbot endpoint """
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
    try:
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
                    "the user uses it first. If asked or when a user changes to a different language, be ready to reply in Chinese (Mandarin), Malay, Tamil, or " \
                    "whatever language the user is now using.\n\n" \
                    "If a question is outside your capabilities (e.g. drug side effects, deep trauma, or legal and financial issues), respond with:\n" \
                    "'I want to support you, but this is something a professional can help with better. Would you be open to talking to one?'\n\n" \
                    "Above all, be a steady, encouraging presence. You are not here to fix the user. You are here to walk alongside them.")] + \
                    history_messages + [HumanMessage(content=user_msg)]

        response = llm.invoke(messages)
        print(f"[APP] Bot response: {response.content[:100]}")
        return {"botResponse": response.content}
    except Exception as e:
        print(f"[ERROR] Chatbot failed: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

""" OCR endpoint """
class MedInfoExtractor:
    def __init__(self, llm):
        self.llm = llm
        self.parser = SimpleJsonOutputParser()
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert assistant that extracts medication details from text.
             Your task is to extract the medication name, dosage, frequency, duration, and additional notes.

             Always respond in valid JSON format. Here are some examples of the expected output format:

             Example 1:
             {{
                "medicine_name": "Ezetimibe",
                "dosage": "900mg",
                "frequency": "One tablet every morning",
                "duration": "No set duration",
                "additional_notes": "May be taken with or without food. Stop medication only on doctor's advice."
             }} 

             Example 2:
             {{
                "medicine_name": "Amoxicillin",
                "dosage": "500mg",
                "frequency": "Twice a day",
                "duration": "7 days",
                "additional_notes": "Take with food."
             }}

             Important Instructions:
             - Pay close attention to details like medication names, dosages, and frequencies.
             - Your output in JSON format have to always and only contain the following keys: "medicine_name", "dosage", "frequency", "duration", and "additional_notes".
             - If there are no additional notes, set the "additional_notes" key value as "Not applicable".
             - If there is no set duration, set the "duration" key value as "No set duration".
             - Do not make assumptions or guesses about missing information. If no relevant information can be found for a specific key, assign its value as "Not identified".
             """),
             ("human", "{extracted_text}")
        ])

    def extract_med_info(self, text: str) -> dict:
        print(f"[OCR] Extracting med info from text: {text}...")
        try:
            chain = self.prompt | self.llm | self.parser
            result = chain.invoke({"extracted_text": text})
            print("[OCR] Extraction result: ", result)
            return result
        except Exception as e:
            print("[ERROR] Failed to extract med info: ", e)
            return {
                "medicine_name": "Not identified because of error",
                "dosage": "Not identified because of error",
                "frequency": "Not identified because of error",
                "duration": "Not identified because of error",
                "additional_notes": "Not identified because of error"
            }
        
med_extractor = MedInfoExtractor(llm)

@app.post("/ocr")
async def extract_text(file: UploadFile = File(...)):
    try:
        print("[APP] Running OCR...")
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))

        pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

        extracted_text = pytesseract.image_to_string(image)
        med_info = med_extractor.extract_med_info(extracted_text)
        return {
            "extracted_text": extracted_text,
            "medication_info": med_info
        }
    except Exception as e:
        print(f"[ERROR] OCR failed: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)