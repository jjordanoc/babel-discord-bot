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
from youtubesearchpython import VideosSearch
import yt_dlp as youtube_dl

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

# Constants to handle audio actions
PAUSE_MUSIC = "$$PAUSE_MUSIC$$"
FINISH_MUSIC = "$$FINISH_MUSIC$$"
START_MUSIC = "$$START_MUSIC$$"


def gpt_request(prompt: str, model: str = "gpt-3.5-turbo-0613") -> str:
    """
    A generator that yields sentences from a request to the openai api
    :param prompt: prompt to be sent to gpt
    :param model: openai model to use
    :return: sentences of the response
    """
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


def synthesize_voice(text: str, speaker: str) -> bytes:
    """
    :param text: the text which is to be synthesized
    :param speaker: a valid Azure Cognitive Services voice code
    :return: the audio of the synthesized text
    """
    azure_url = f"""https://{os.getenv("SPEECH_REGION")}.tts.speech.microsoft.com/cognitiveservices/v1"""

    azure_headers = {"Ocp-Apim-Subscription-Key": F"""{os.getenv("SPEECH_KEY")}""",
                     "Content-type": "application/ssml+xml",
                     "X-Microsoft-OutputFormat": "ogg-48khz-16bit-mono-opus"}
    # Fix unrecognizeable characters
    text = text.encode('ascii', 'xmlcharrefreplace').decode("ascii")
    azure_body = f"""<speak version='1.0' xml:lang="en-US"><voice xml:lang="en-US" name='{speaker}'>{text}</voice></speak>"""
    response_azure = req.post(azure_url, headers=azure_headers, data=azure_body)
    return response_azure.content


def choose_voice(src_lang: str, trg_lang: str, gender_lang: str, use_src_lang: bool) -> str:
    """
    :param src_lang: a valid language code to use as source language
    :param trg_lang: a valid language code to use as target language
    :param gender_lang: either 'Female' or 'Male'
    :param use_src_lang: uses src_lang if True, trg_lang if False
    :return: the Azure Cognitive Services voice code given by the specified langauge and gender
    """
    if use_src_lang:
        if src_lang == "en":
            if gender_lang == "Female":
                return "en-US-JennyNeural"
            elif gender_lang == "Male":
                return "en-US-BrandonNeural"
        elif src_lang == "es":
            if gender_lang == "Female":
                return "es-PE-CamilaNeural"
            elif gender_lang == "Male":
                return "es-PE-AlexNeural"
        elif src_lang == "fr":
            if gender_lang == "Female":
                return "fr-FR-DeniseNeural"
            elif gender_lang == "Male":
                return "fr-FR-HenriNeural"
        elif src_lang == "it":
            if gender_lang == "Female":
                return "it-IT-ElsaNeural"
            elif gender_lang == "Male":
                return "it-IT-DiegoNeural"
        elif src_lang == "de":
            if gender_lang == "Female":
                return "de-DE-AmalaNeural"
            elif gender_lang == "Male":
                return "de-DE-KasperNeural"
    else:
        if trg_lang == "en":
            if gender_lang == "Female":
                return "en-US-JennyNeural"
            elif gender_lang == "Male":
                return "en-US-BrandonNeural"
        elif trg_lang == "es":
            if gender_lang == "Female":
                return "es-PE-CamilaNeural"
            elif gender_lang == "Male":
                return "es-PE-AlexNeural"
        elif trg_lang == "fr":
            if gender_lang == "Female":
                return "fr-FR-DeniseNeural"
            elif gender_lang == "Male":
                return "fr-FR-HenriNeural"
        elif trg_lang == "it":
            if gender_lang == "Female":
                return "it-IT-ElsaNeural"
            elif gender_lang == "Male":
                return "it-IT-DiegoNeural"
        elif trg_lang == "de":
            if gender_lang == "Female":
                return "de-DE-AmalaNeural"
            elif gender_lang == "Male":
                return "de-DE-KasperNeural"


@app.websocket("/")
async def audio_socket(websocket: WebSocket):
    main_gpt_flag = False
    music_flag = False
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

    async def translate_and_send_audio_chunk(result):
        """
        Listen for any transcripts received from Deepgram
        and use them for translation, querying or playing music
        """
        nonlocal main_gpt_flag, music_flag
        print("MAIN_GPT_FLAG 1 = " + str(main_gpt_flag))
        print("MUSIC_FLAG 1 = " + str(music_flag))
        print(result)
        if "is_final" in result and result["is_final"]:
            transcription = result["channel"]["alternatives"][0]["transcript"]

            if transcription[0:5].lower() == "babel" and len(transcription) <= 6:
                main_gpt_flag = True
                print("MAIN_GPT_FLAG 2 = " + str(main_gpt_flag))

                with open('noti-sound.opus', 'rb') as f:
                    data = f.read()
                    await websocket.send_bytes(data)

                return

            if transcription[0:11].lower() == "babel music" and len(transcription) <= 12:
                music_flag = True
                print("MUSIC_FLAG 2 = " + str(music_flag))

                with open('noti-sound.opus', 'rb') as f:
                    data = f.read()
                    await websocket.send_bytes(data)

                return

            if transcription[0:10].lower() == "stop music" and len(transcription) <= 12:
                await websocket.send_text(PAUSE_MUSIC)
                return

            if transcription == "":
                print("Empty transcription")
                return

            speaker = choose_voice(src_lang=src_lang, trg_lang=trg_lang, gender_lang=gender_lang,
                                   use_src_lang=main_gpt_flag or music_flag)

            if music_flag:
                YDL_OPTIONS = {'format': 'bestaudio',
                               'outtmpl': 'song',
                               'postprocessors': [{
                                   'key': 'FFmpegExtractAudio',
                                   'preferredcodec': 'opus',
                                   'preferredquality': '192',
                               }]
                               }

                search_all = VideosSearch(transcription, limit=1)
                title = search_all.result()["result"][0]["title"]
                link = search_all.result()["result"][0]["link"]

                await websocket.send_text(START_MUSIC)
                await websocket.send_bytes(synthesize_voice(text=f"Playing {title}", speaker=speaker))

                with youtube_dl.YoutubeDL(YDL_OPTIONS) as ydl:
                    ydl.extract_info(link, download=True)

                with open('song.opus', 'rb') as f:
                    data = f.read()
                    await websocket.send_bytes(data)

                music_flag = False

            elif main_gpt_flag:
                for sentence in gpt_request(transcription):
                    await websocket.send_bytes(synthesize_voice(text=sentence, speaker=speaker))
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
                main_gpt_flag = False
                await websocket.send_bytes(synthesize_voice(text=translation, speaker=speaker))

    deepgram_live.registerHandler(deepgram_live.event.TRANSCRIPT_RECEIVED, translate_and_send_audio_chunk)

    async def receive_audio():
        """
        Receive the audio asynchronously and send it to deepgram
        """
        while True:
            audio_bytes: bytes = await websocket.receive_bytes()
            deepgram_live.send(audio_bytes)

    async def keep_deepgram_alive():
        """
        Make sure the connection is kept alive by
        sending a KeepAlive JSON to Deepgram every 7 seconds
        """
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
