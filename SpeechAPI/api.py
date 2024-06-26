import asyncio
import json

import openai
import requests as req
import uvicorn
from deepgram import Deepgram

from fastapi import FastAPI, WebSocket
from google.cloud import translate
from youtubesearchpython import VideosSearch
import yt_dlp as youtube_dl

from config import Config

app = FastAPI()

config = Config()

# Initialize external services
deepgram = Deepgram(config.DEEPGRAM_API_KEY)
translate_client = translate.TranslationServiceClient()
openai.api_key = config.OPENAI_API_KEY

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
    azure_url = f"""https://{config.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1"""

    azure_headers = {"Ocp-Apim-Subscription-Key": F"""{config.AZURE_SPEECH_API_KEY}""",
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

    voice_codes = {
        "en": {"Female": "en-US-JennyNeural", "Male": "en-US-BrandonNeural"},
        "es": {"Female": "es-PE-CamilaNeural", "Male": "es-PE-AlexNeural"},
        "fr": {"Female": "fr-FR-DeniseNeural", "Male": "fr-FR-HenriNeural"},
        "it": {"Female": "it-IT-ElsaNeural", "Male": "it-IT-DiegoNeural"},
        "de": {"Female": "de-DE-AmalaNeural", "Male": "de-DE-KasperNeural"},
    }

    lang = src_lang if use_src_lang else trg_lang
    return voice_codes.get(lang, {}).get(gender_lang)


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
            {"punctuate": True,
             "model": "enhanced",
             "language": src_lang,
             "encoding": "linear16",
             "sample_rate": 48000,
             "channels": 1,
             "keywords": ["Babel:10000", "Bavel:-10000", "bavel:-10000"],
             }
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

        if "is_final" in result and result["is_final"]:
            transcription = result["channel"]["alternatives"][0]["transcript"]

            if transcription[0:5].lower() == "babel" and len(transcription) <= 6:
                main_gpt_flag = True

                with open('noti-sound.opus', 'rb') as f:
                    data = f.read()
                    await websocket.send_bytes(data)

                return

            if (transcription[0:11].lower() == "babel music" and len(transcription) <= 12 and src_lang == "en") or \
               (transcription[0:12].lower() == "babel música" and len(transcription) <= 13 and src_lang == "es") or \
               (transcription[0:13].lower() == "babel musique" and len(transcription) <= 14 and src_lang == "fr") or \
               (transcription[0:13].lower() == "babele musica" and len(transcription) <= 14 and src_lang == "it") or \
               (transcription[0:11].lower() == "babel musik" and len(transcription) <= 12 and src_lang == "de"):

                    music_flag = True

                    with open('noti-sound.opus', 'rb') as f:
                        data = f.read()
                        await websocket.send_bytes(data)

                    return

            if (transcription[0:10].lower() == "stop music" and len(transcription) <= 11 and src_lang == "en") or \
               (transcription[0:12].lower() == "parar música" and len(transcription) <= 13 and src_lang == "es") or \
               (transcription[0:18].lower() == "arrêter la musique" and len(transcription) <= 19 and src_lang == "fr") or \
               (transcription[0:17].lower() == "fermare la musica" and len(transcription) <= 18 and src_lang == "it") or \
               (transcription[0:21].lower() == "stoppen sie die musik" and len(transcription) <= 22 and src_lang == "de"):

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

                await websocket.send_bytes(synthesize_voice(text=f"Playing {title}", speaker=speaker))
                await websocket.send_text(START_MUSIC)

                with youtube_dl.YoutubeDL(YDL_OPTIONS) as ydl:
                    ydl.extract_info(link, download=True)

                with open('song.opus', 'rb') as f:
                    data = f.read()
                    await websocket.send_bytes(data)
                    await websocket.send_text(FINISH_MUSIC)

                music_flag = False

            elif main_gpt_flag:
                for sentence in gpt_request(transcription):
                    await websocket.send_bytes(synthesize_voice(text=sentence, speaker=speaker))
                main_gpt_flag = False
            else:
                # Translate transcription
                google_translate_response = translate_client.translate_text(
                    request={
                        "parent": config.GOOGLE_TRANSLATE_PARENT_DIRECTORY,
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
