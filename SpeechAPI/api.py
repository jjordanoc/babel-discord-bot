import asyncio
import os

import requests as req
import uvicorn
from deepgram import Deepgram
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket
from google.cloud import translate

load_dotenv()

app = FastAPI()

# The API key you created in step 1
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

# Initializes the Deepgram SDK
deepgram = Deepgram(DEEPGRAM_API_KEY)

PROJECT_ID = os.getenv("PROJECT_ID")
translate_client = translate.TranslationServiceClient()
location = "global"
parent = f"projects/{PROJECT_ID}/locations/{location}"


@app.websocket("/")
async def audio_socket(websocket: WebSocket):
    await websocket.accept()
    # Receive the source language and the target language
    languages = await websocket.receive_json()
    print(languages)
    src_lang = languages["source"]
    trg_lang = languages["target"]
    gender_lang = languages["gender"]

    # Create a websocket connection to Deepgram
    try:
        deepgramLive = await deepgram.transcription.live(
            {"punctuate": True, "model": "nova", "language": src_lang, "encoding": "linear16", "sample_rate": 48000,
             "channels": 1}
        )
    except Exception as e:
        print(f'Could not open socket: {e}')
        await websocket.close(code=500)
        return
    print('websocket.accept')

    # Listen for the connection to close
    deepgramLive.registerHandler(deepgramLive.event.CLOSE, lambda _: print('Connection closed.'))

    # Listen for any transcripts received from Deepgram and write them to the console (translate them)
    async def translate_and_send_audio_chunk(result):
        print(result)
        if result["is_final"]:
            transcription = result["channel"]["alternatives"][0]["transcript"]
            if transcription == "":
                print("Empty transcription")
                return
            response = translate_client.translate_text(
                request={
                    "parent": parent,
                    "contents": [transcription],
                    "mime_type": "text/plain",
                    "source_language_code": src_lang,
                    "target_language_code": trg_lang,
                }
            )
            if response.translations:
                translation = response.translations[0].translated_text
            else:
                print(f"Error in translation {response}")
                return
            azure_url = f"""https://{os.getenv("SPEECH_REGION")}.tts.speech.microsoft.com/cognitiveservices/v1"""

            azure_headers = {"Ocp-Apim-Subscription-Key": F"""{os.getenv("SPEECH_KEY")}""",
                             "Content-type": "application/ssml+xml",
                             "X-Microsoft-OutputFormat": "ogg-48khz-16bit-mono-opus"}

            if trg_lang == "en":
                if gender_lang == "Female":
                    speaker = "en-US-JennyNeural"
                elif gender_lang == "Male":
                    speaker = "en-US-BrandonNeural"
            elif trg_lang == "es":
                if gender_lang == "Female":
                    speaker = "es-PE-CamilaNeural"
                elif gender_lang == "Male":
                    speaker = "es-PE-AlexNeural"
            elif trg_lang == "fr":
                if gender_lang == "Female":
                    speaker = "fr-FR-DeniseNeural"
                elif gender_lang == "Male":
                    speaker = "fr-FR-HenriNeural"
            elif trg_lang == "it":
                if gender_lang == "Female":
                    speaker = "it-IT-ElsaNeural"
                elif gender_lang == "Male":
                    speaker = "it-IT-DiegoNeural"

            azure_body = f"""<speak version='1.0' xml:lang='en-US'><voice xml:lang='en-US' xml:gender='{gender_lang}' name='{speaker}'>{translation}</voice></speak>"""
            response_azure = req.post(azure_url, headers=azure_headers, data=azure_body)
            audio = response_azure.content

            await websocket.send_bytes(audio)

    deepgramLive.registerHandler(deepgramLive.event.TRANSCRIPT_RECEIVED,translate_and_send_audio_chunk)

    async def receive_audio():
        while True:
            # RECEIVE
            audio_bytes: bytes = await websocket.receive_bytes()
            deepgramLive.send(audio_bytes)

    receive_task = asyncio.create_task(receive_audio())

    try:
        await asyncio.gather(receive_task)
    except Exception as e:
        print("Error in socket:", e)
    finally:
        await deepgramLive.finish()

    print('leave websocket_endpoint')


if __name__ == '__main__':
    uvicorn.run('api:app', host='0.0.0.0')
