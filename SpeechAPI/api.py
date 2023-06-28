import asyncio
import json
import os

import openai
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

openai.api_key = os.getenv("GPT_KEY")


def gpt3_request(prompt, model="gpt-3.5-turbo-0613"):
    messages = [
        {"role": "user", "content": prompt}
    ]

    current_sentence = ''
    for chunk in openai.ChatCompletion.create(
            model=model,
            messages=messages,
            stream=True,
    ):
        content = chunk["choices"][0].get("delta", {}).get("content")
        if content is not None:
            current_sentence += content
            if content.endswith('.'):
                yield current_sentence
                current_sentence = ''


@app.websocket("/")
async def audio_socket(websocket: WebSocket):
    main_gpt_flag = False
    await websocket.accept()
    # Receive the source language and the target language
    languages = await websocket.receive_json()
    src_lang = languages["source"]
    trg_lang = languages["target"]
    gender_lang = languages["gender"]

    # Create a websocket connection to Deepgram
    try:
        deepgram_live = await deepgram.transcription.live(
            {"punctuate": True, "model": "enhanced", "language": src_lang, "encoding": "linear16", "sample_rate": 48000,
             "channels": 1}
        )
    except Exception as e:
        print(f'Could not open socket: {e}')
        await websocket.close(code=500)
        return

    # Listen for the connection to close
    deepgram_live.registerHandler(deepgram_live.event.CLOSE, lambda _: print('Connection with deepgram closed.'))

    """
    Listen for any transcripts received from Deepgram
    and use them for translation, querying or playing music
    """

    async def translate_and_send_audio_chunk(result):
        nonlocal main_gpt_flag
        print("MAIN_GPT_FLAG 1 = " + str(main_gpt_flag))
        print(result)
        if "is_final" in result and result["is_final"]:
            transcription = result["channel"]["alternatives"][0]["transcript"]

            # Checks if 'Babel' was said and turns the gpt_flag true.
            # Also plays a sound indicating a call to GPT was requested
            if transcription[0:5] == "Babel":
                main_gpt_flag = True
                print("MAIN_GPT_FLAG 2 = " + str(main_gpt_flag))

                with open('noti-sound.opus', 'rb') as f:
                    data = f.read()
                    await websocket.send_bytes(data)

                return

            if transcription == "":
                print("Empty transcription")
                return

            # If the user is making a voice query, the speaker's voice should be in the user's source language
            speaker = ""
            if main_gpt_flag:
                if src_lang == "en":
                    if gender_lang == "Female":
                        speaker = "en-US-JennyNeural"
                    elif gender_lang == "Male":
                        speaker = "en-US-BrandonNeural"
                elif src_lang == "es":
                    if gender_lang == "Female":
                        speaker = "es-PE-CamilaNeural"
                    elif gender_lang == "Male":
                        speaker = "es-PE-AlexNeural"
                elif src_lang == "fr":
                    if gender_lang == "Female":
                        speaker = "fr-FR-DeniseNeural"
                    elif gender_lang == "Male":
                        speaker = "fr-FR-HenriNeural"
                elif src_lang == "it":
                    if gender_lang == "Female":
                        speaker = "it-IT-ElsaNeural"
                    elif gender_lang == "Male":
                        speaker = "it-IT-DiegoNeural"
                elif trg_lang == "de":
                    if gender_lang == "Female":
                        speaker = "de-DE-AmalaNeural"
                    elif gender_lang == "Male":
                        speaker = "de-DE-KasperNeural"
            # Otherwise, the translation should be spoken in the target language
            else:
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
                elif trg_lang == "de":
                    if gender_lang == "Female":
                        speaker = "de-DE-AmalaNeural"
                    elif gender_lang == "Male":
                        speaker = "de-DE-KasperNeural"

            azure_url = f"""https://{os.getenv("SPEECH_REGION")}.tts.speech.microsoft.com/cognitiveservices/v1"""

            azure_headers = {"Ocp-Apim-Subscription-Key": F"""{os.getenv("SPEECH_KEY")}""",
                             "Content-type": "application/ssml+xml",
                             "X-Microsoft-OutputFormat": "ogg-48khz-16bit-mono-opus"}

            if main_gpt_flag:
                for sentence in gpt3_request(transcription):
                    translation = sentence
                    translation = translation.encode('ascii', 'xmlcharrefreplace').decode("ascii")
                    azure_body = f"""<speak version='1.0' xml:lang="en-US"><voice xml:lang="en-US" xml:gender='{gender_lang}' name='{speaker}'>{translation}</voice></speak>"""
                    response_azure = req.post(azure_url, headers=azure_headers, data=azure_body)
                    audio = response_azure.content
                    await websocket.send_bytes(audio)
                main_gpt_flag = False
            else:
                # Translate transcription
                google_translate_response = translate_client.translate_text(
                    request={
                        "parent": parent,
                        "contents": [transcription],
                        "mime_type": "text/plain",
                        "source_language_code": src_lang,
                        "target_language_code": trg_lang,
                    }
                )

                if google_translate_response.translations:
                    translation = google_translate_response.translations[0].translated_text
                else:
                    print(f"Error in translation {google_translate_response}")
                    return
                # Fix unrecognizeable characters
                translation = translation.encode('ascii', 'xmlcharrefreplace').decode("ascii")
                azure_request_body = f"""<speak version='1.0' xml:lang="en-US"><voice xml:lang="en-US" xml:gender='{gender_lang}' name='{speaker}'>{translation}</voice></speak>"""
                azure_text_to_speech_response = req.post(azure_url, headers=azure_headers, data=azure_request_body)
                audio = azure_text_to_speech_response.content
                main_gpt_flag = False
                await websocket.send_bytes(audio)

    deepgram_live.registerHandler(deepgram_live.event.TRANSCRIPT_RECEIVED, translate_and_send_audio_chunk)

    """
    Receive the audio asynchronously and send it to deepgram
    """

    async def receive_audio():
        while True:
            audio_bytes: bytes = await websocket.receive_bytes()
            deepgram_live.send(audio_bytes)

    """
    Make sure the connection is kept alive by
    sending a KeepAlive JSON to Deepgram every 7 seconds
    """

    async def keep_deepgram_alive():
        while True:
            deepgram_live.send(json.dumps({
                "type": "KeepAlive"
            }))
            await asyncio.sleep(7)

    receive_audio_task = asyncio.create_task(receive_audio())
    keep_deepgram_alive_task = asyncio.create_task(keep_deepgram_alive())

    try:
        await asyncio.gather(receive_audio_task, keep_deepgram_alive_task)
    except Exception as e:
        print("Error in websocket:", e)
    finally:
        await deepgram_live.finish()
    print('Websocket connection closed')


if __name__ == '__main__':
    uvicorn.run('api:app', host='0.0.0.0')
