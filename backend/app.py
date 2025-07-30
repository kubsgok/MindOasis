import os
import json
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain.schema.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain.output_parsers.json import SimpleJsonOutputParser
from typing import List, Tuple
from PIL import Image
from huaweicloudsdkcore.auth.credentials import BasicCredentials
from huaweicloudsdkocr.v1.region.ocr_region import OcrRegion
from huaweicloudsdkcore.exceptions import exceptions
from huaweicloudsdkocr.v1 import *

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

# LLM Evaluator
class LLMEvaluator:
    def __init__(self, llm):
        self.llm = llm
        self.parser = SimpleJsonOutputParser()
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", (
                "You are a mental health chatbot response evaluator. Your job is to assess a proposed response to a user's message based on 4 binary criteria.\n"
                "Evaluate the proposed response by answering the following questions with true or false (boolean), followed by a short explanation.\n\n"
                "1. Emotional tone:\n"
                "- If the user's message is not facts-related, was the chatbot's response emotionally warm and empathetic?\n\n"
                "2. Helpfulness:\n"
                "- Did the chatbot provide helpful, relevant, and accurate support?\n\n"
                "3. Safety:\n"
                "- Did the chatbot's response raise any safety concerns?\n\n"
                "4. Conciseness and Length:\n"
                "- Is the chatbot's response concise, and 1 to 3 sentences long?"
                "Always respond in valid JSON format:\n"
                "{{\n"
                """    "emotional_tone": boolean,\n"""
                """    "helpful": boolean,\n"""
                """    "safety_concern": boolean,\n"""
                """    "conciseness_length": boolean,\n"""
                """    "comments": {{\n"""
                """        "emotional_tone": string,\n"""
                """        "helpful": string,\n"""
                """        "safety_concern": string,\n"""
                """        "conciseness_length": string\n"""
                "    }}\n"
                "}}\n\n"
                "Here are some examples of the expected output format:\n"
                "Example 1:\n"
                "{{\n"
                """    "emotional_tone": false,\n"""
                """    "helpful": true,\n"""
                """    "safety_concern": false,\n"""
                """    "conciseness_length": true,\n"""
                """    "comments": {{\n"""
                """        "emotional_tone": "The chatbot sounded robotic and did not acknowledge the user's feelings.",\n"""
                """        "helpful": "The chatbot provided a useful suggestion about medication timing.",\n"""
                """        "safety_concern": "No safety issues were present.",\n"""
                """        "conciseness_length": "The chatbot response was concise, and 3 sentences long."\n"""
                """    }}\n"""
                "}}\n\n"
                "Example 2:\n"
                """{{\n"""
                """    "emotional_tone": true,\n"""
                """    "helpful": true,\n"""
                """    "safety_concern": false,\n"""
                """    "conciseness_length": false,\n"""
                """    "comments": {{\n"""
                """        "emotional_tone": "The chatbot acknowledged the user's feelings and gave advice in a gentle, warm tone.",\n"""
                """        "helpful": "The chatbot referred the user to the appropriate medical party.",\n"""
                """        "safety_concern": "No safety issues were present."\n"""
                """        "conciseness_length": "The chatbot response was lengthy, being more than 3 sentences long."\n"""
                """    }}\n"""
                """}}\n\n"""
                """Your output in JSON format have to always and only contain the following keys: "emotional_tone", "helpful", "safety_concern", "conciseness_length", and "comments".\n"""
            )),
             ("human", "User message:\n{user_msg}\n\nProposed response:\n{initial_response}\n\nEvaluate the proposed response to the user's message.")
        ])

    def run_evaluator_chain(self, user_msg: str, initial_response: str) -> dict:
        print(f"[LLM EVALUATOR] Evaluating initial chatbot response...")
        try:
            chain = self.prompt | self.llm | self.parser
            result = chain.invoke({"user_msg": user_msg, "initial_response": initial_response})
            print("[LLM EVALUATOR] Evaluation result: ", result)
            return result
        except Exception as e:
            print("[ERROR] Failed to evaluate initial chatbot response: ", e)
            return {
                "emotional_tone": True,
                "helpful": True,
                "safety_concern": False,
                "conciseness_length": True,
                "comments": {
                    "emotional_tone": "No comments as evaluator failed to run",
                    "helpful": "No comments as evaluator failed to run",
                    "safety_concern": "No comments as evaluator failed to run",
                    "conciseness_length": "No comments as evaluator failed to run"
                }
            }
        
# LLM Revisor
class LLMRevisor:
    def __init__(self, llm):
        self.llm = llm
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", (
                "You are a mental health chatbot assistant. Revise the initially proposed chatbot response based on the issues flagged by the evaluator.\n\n"
                "Your revised response must:\n"
                "- Answer the user message"
                "- Be emotionally warm and empathetic (if emotional_tone was flagged as False)\n"
                "- Be helpful, relevant, and accurate (if helpful was flagged as False)\n"
                "- Avoid unsafe or potentially triggering content (if safety_concern was flagged as True)\n"
                "- Be 1 to 3 sentences long\n"
                "- Avoid clinical or judgmental phrasing\n"
                "- Use warm, validating, and youth-friendly language\n\n"
                "Return ONLY the revised message as plain text. Do NOT include explanations or meta-comments."
            )),
             ("human", (
                "User message:\n{user_msg}\n\n"
                "Initially proposed chatbot response:\n{initial_response}\n\n"
                "Evaluator feedback:\n{evaluation_json}\n\n"
                "Revise the initially proposed chatbot response based on the evaluator feedback, ensuring relevance to the user's message."
             ))
        ])

    def run_revisor_chain(self, user_msg: str, initial_response: str, evaluation_json: str) -> dict:
        print(f"[LLM REVISOR] Revising initial chatbot response...")
        try:
            chain = self.prompt | self.llm
            result = chain.invoke({"user_msg": user_msg, "initial_response": initial_response, "evaluation_json": evaluation_json})
            print("[LLM REVISOR] Revised chatbot response: ", result.content)
            return result.content
        except Exception as e:
            print("[ERROR] Failed to revise initial chatbot response, returning initial response: ", e)
            return initial_response

llm_evaluator = LLMEvaluator(llm)
llm_revisor = LLMRevisor(llm)

@app.post("/chatbot")
async def chat(req: ChatRequest):
    try:
        user_id = req.user_id
        user_msg = req.message
        chat_history = req.chat_history

        print(f"[APP] Received message from {user_id}: {user_msg}")
        print(f"[APP] Chat history length: {len(chat_history)}")

        history_messages = format_chat_history(chat_history)

        # Get initial response
        system_prompt = (
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
        )
        messages = [SystemMessage(content=system_prompt)] + history_messages + [HumanMessage(content=user_msg)]

        initial_response = llm.invoke(messages).content.strip()
        print(f"[APP] Initial bot response: {initial_response}")

        # Evaluate initial chatbot response
        evaluation_result = llm_evaluator.run_evaluator_chain(user_msg, initial_response)

        # Check if revision is needed
        needs_revision = (
            not evaluation_result["emotional_tone"] or
            not evaluation_result["helpful"] or
            evaluation_result["safety_concern"] or
            not evaluation_result["conciseness_length"]
        )

        if needs_revision:
            print("[APP] Evaluation flagged issues, revising response...")
            revised_response = llm_revisor.run_revisor_chain(user_msg, initial_response, json.dumps(evaluation_result))
        else:
            print(f"[APP] No issues found in initial bot response, returning initial response...")
            revised_response = initial_response

        return {"botResponse": revised_response}
    
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

class ImageInput(BaseModel):
    image_base64: str

@app.post("/huawei-ocr")
async def huawei_ocr(image: ImageInput):
    load_dotenv()
    ak = os.getenv("CLOUD_SDK_AK")
    sk = os.getenv("CLOUD_SDK_SK")

    credentials = BasicCredentials(ak, sk)

    client = OcrClient.new_builder() \
        .with_credentials(credentials) \
        .with_region(OcrRegion.value_of("ap-southeast-1")) \
        .build()

    try: 
        request = RecognizeGeneralTextRequest()
        request.body = GeneralTextRequestBody(
            image = image.image_base64,
            detect_direction = True
        )
        response = client.recognize_general_text(request)

        words_block_list = response.result.words_block_list
        extracted_text = " ".join(block.words for block in words_block_list)
        print("[Huawei OCR] Extracted text: ", extracted_text)
        med_info = med_extractor.extract_med_info(extracted_text)
        return {
            "extracted_text": extracted_text,
            "medication_info": med_info
        }
    except exceptions.ClientRequestException as e:
        print(e.status_code)
        print(e.request_id)
        print(e.error_code)
        print(e.error_msg)
        return JSONResponse(content={"error": str(e)}, status_code=500)