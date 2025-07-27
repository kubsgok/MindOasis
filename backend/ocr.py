import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from huaweicloudsdkcore.auth.credentials import BasicCredentials
from huaweicloudsdkocr.v1.region.ocr_region import OcrRegion
from huaweicloudsdkcore.exceptions import exceptions
from huaweicloudsdkocr.v1 import *

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
        print("[Python OCR] Extracted text: ", extracted_text)
        return JSONResponse(content={"text": extracted_text})
    except exceptions.ClientRequestException as e:
        print(e.status_code)
        print(e.request_id)
        print(e.error_code)
        print(e.error_msg)
        return JSONResponse(content={"error": str(e)}, status_code=500)