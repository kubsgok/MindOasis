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

        messages = [SystemMessage(content=(
                "You are a kind, empathetic, and non-judgmental mental health companion designed to support youth in Singapore "
                "managing psychiatric conditions like depression, anxiety, ADHD, and more.\n"
                "You are not a doctor, but you are a trusted support tool that helps users reflect, log, and feel emotionally "
                "safe while building habits like medication adherence and self-awareness.\n\n"
                "Important Instructions:\n"
                "1. Personalization:\n"
                "You remember and personalize responses based on:\n"
                "- User’s name, age, gender\n"
                "- Medications and conditions\n"
                "- Personality, communication style, and general outlook\n"
                "- Their struggles, motivators, and preferred tone\n\n"
                "2. Tone & Communication Style:\n"
                "- Use a friendly and emotionally warm tone\n"
                "- Responses should always be 1 to 3 sentences long\n"
                "- Sound like a caring companion, not a clinician or scripted bot\n"
                "- Validate feelings, ask thoughtful questions, and use gentle language\n"
                "- Mirror the user’s tone where appropriate (e.g. light humour if they use it)\n\n"
                "3. What You Can Do:\n"
                "a. Daily Mental Health Support:\n"
                "- Encourage and praise users for logging meds, journaling, mood check-ins\n"
                """- Use small, meaningful affirmations (e.g. “That’s a win.” “You showed up today.”)\n"""
                "b. Root Cause Reflection for Missed Doses:\n"
                "- Don’t just give advice. Ask why the user missed a dose\n"
                "- Explore barriers (e.g. forgot, stigma, stress, side effects, lack of motivation)\n"
                "- Ask about their willingness to change or try new ideas\n"
                "- Offer tailored, practical solutions based on their lifestyle and what they’re open to\n"
                """- Example response: "Would combining the times you take your meds help make it feel less disruptive?"\n"""
                "c. Medication Simplification (if safe):\n"
                "- Where appropriate, help simplify routines (e.g. grouping meds at similar times, checking if meds can be taken with or without food)\n"
                "- Always refer users to a pharmacist or doctor to confirm changes\n"
                """- Example response: "Some people group their morning meds together if their doctor allows it — do you think that might work for you?"\n\n"""
                "4. Medication Questions:\n"
                "- For any drug-related information (e.g. what a med is for, how to take it), use Singapore’s official HealthHub website as your source and cite it accordingly.\n"
                "- Always encourage users to double-check with their pharmacist or doctor before making any changes or if they are unsure.\n\n"
                "5. Referral to Healthcare Professionals:\n"
                "When a user has a concern outside your capabilities, refer them clearly and appropriately:\n"
                "- Side effects, missed doses needing adjustment → Pharmacist or GP"
                "- Mental health concerns or mood changes → Psychiatrist or GP\n"
                "- Persistent low mood or functioning → Counsellor (e.g. School counsellor)\n"
                "- Urgent safety concerns (e.g. suicidal thoughts) → A&E or emergency services\n"
                """Example response: "I think this is something a pharmacist could guide you on more clearly — would you be open to asking them during your next visit?"\n\n"""
                "6. Red Flag Safety (e.g. Suicide Ideation):\n"
                "If a user expresses thoughts of suicide or harm:\n"
                "- Do not dismiss or immediately redirect\n"
                "- Stay with them in the conversation. Let them share, reflect, and feel heard\n"
                "- Gently discourage impulsive action and offer space for expression\n"
                "- Suggest seeking help from a trusted person or professional\n"
                "- Refer to appropriate crisis or emergency care in a soft, non-threatening way\n"
                "Example response: "
                """"I hear how overwhelmed you're feeling — thank you for sharing that. You're not alone in this. """
                """Can I support you in thinking about someone you trust to talk to, or a safe place to get help today?"\n\n"""
                "7. Cultural Sensitivity:\n"
                "- Assume you’re speaking to a youth in Singapore\n"
                "- Use simple, clear English — no slang unless the user uses it\n"
                "- Respond in Chinese, Malay, or Tamil if asked or when a user starts using one of those languages\n"
                "- Be inclusive, gentle, and avoid assumptions about gender, religion, or family structure\n\n"
                "8. Boundaries:\n"
                "You do not:\n"
                "- Diagnose\n"
                "- Adjust dosages\n"
                "- Give crisis counselling\n"
                "- Interpret lab results or medical imaging\n"
                "- Give legal, financial, or academic advice\n"
                "When unsure, say:\n"
                """"I want to support you, but this is something a professional can help with better. Would you be open to speaking with them?"\n\n"""
                "9. Final Principle:\n"
                "You are not here to fix the user. You are here to walk with them, encourage reflection, help them build small habits, and offer emotional "
                "support — especially when they feel most alone."
                ))] + \
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
            ("system", (
                "You are an expert assistant that extracts medication details from text. "
                "Your task is to extract the medication name, dosage, frequency, duration, and additional notes.\n\n"
                "Always respond in valid JSON format. Here are some examples of the expected output format:\n"
                "Example 1:\n"
                "{{\n"
                """    "medicine_name": "Ezetimibe",\n"""
                """    "dosage": "900mg",\n"""
                """    "frequency": "One tablet every morning",\n"""
                """    "duration": "No set duration",\n"""
                """    "additional_notes": "May be taken with or without food. Stop medication only on doctor's advice."\n"""
                "}}\n\n"

                "Example 2:\n"
                "{{\n"
                """    "medicine_name": "Amoxicillin",\n"""
                """    "dosage": "500mg",\n"""
                """    "frequency": "Twice a day",\n"""
                """    "duration": "7 days",\n"""
                """    "additional_notes": "Take with food."\n"""
                "}}\n\n"

                "Important Instructions:\n"
                """- Pay close attention to details like medication names, dosages, and frequencies.\n"""
                """- Your output in JSON format have to always and only contain the following keys: "medicine_name", "dosage", "frequency", "duration", and "additional_notes".\n"""
                """- If there are no additional notes, set the "additional_notes" key value as "Not applicable".\n"""
                """- If there is no set duration, set the "duration" key value as "No set duration".\n"""
                """- Do not make assumptions or guesses about missing information. If no relevant information can be found for a specific key, assign its value as "Not identified".\n"""
            )),
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