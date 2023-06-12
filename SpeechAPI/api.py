import itertools
import multiprocessing
import asyncio
import os
import websockets
from multiprocessing import set_start_method
from multiprocessing.queues import Queue
import requests as req
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket
from google.cloud import mediatranslation as media
from google.cloud.mediatranslation_v1beta1 import StreamingTranslateSpeechResponse
from typing import Iterable, Callable, List
from timeit import default_timer as timer

load_dotenv()

# Audio recording parameters
RATE = 16000
CHUNK = int(RATE / 10)  # 100ms
SpeechEventType = media.StreamingTranslateSpeechResponse.SpeechEventType

app = FastAPI()


def audio_generator(q: Queue):
    while True:
        data_bytes: bytes = q.get()
        yield media.StreamingTranslateSpeechRequest(audio_content=data_bytes)


def translation_worker(in_queue: Queue, out_queue: Queue):
    print("Started worker")
    while True:
        print("Restarted worker")
        try:
            print("Begin speaking...")
            client = media.SpeechTranslationServiceClient()

            speech_config = media.TranslateSpeechConfig(
                audio_encoding="linear16",
                source_language_code="es-ES",
                target_language_code="en-US",
                sample_rate_hertz=48000
            )

            config = media.StreamingTranslateSpeechConfig(
                audio_config=speech_config,
                single_utterance=True
            )

            # The first request contains the configuration.
            # Note that audio_content is explicitly set to None.
            first_request = media.StreamingTranslateSpeechRequest(streaming_config=config)
            print("Creted first request")

            requests = itertools.chain(iter([first_request]), audio_generator(in_queue))
            print("Created requests iterator")

            responses = client.streaming_translate_speech(requests)
            print("Created responses from request")

            # Use the translation responses as they arrive
            # out_queue.put(response for response in responses)
            # asyncio.run(send_translation(responses))
            translation = ""
            for response in responses:
                # If time between responses exceeds 1 s, finalize current translation
                if response.speech_event_type == SpeechEventType.END_OF_SINGLE_UTTERANCE:
                    last_index = len(translation)
                    print(f"\nFinal translation: {translation}")

                    azure_url = f"""https://{os.getenv("SPEECH_REGION")}.tts.speech.microsoft.com/cognitiveservices/v1"""

                    azure_headers = {"Ocp-Apim-Subscription-Key": F"""{os.getenv("SPEECH_KEY")}""",
                                     "Content-type": "application/ssml+xml",
                                     "X-Microsoft-OutputFormat": "ogg-48khz-16bit-mono-opus"}

                    azure_body = f"""<speak version='1.0' xml:lang='en-US'><voice xml:lang='en-US' xml:gender='Male' name='en-US-DavisNeural'> {translation} </voice></speak>"""

                    response_azure = req.post(azure_url, headers=azure_headers, data=azure_body)
                    print(len(response_azure.content), " TESTING ")
                    print(response_azure)
                    audio = response_azure.content
                    out_queue.put(audio)
                    print(f"Finished translation worker")
                    break
                else:
                    result = response.result
                    translation = result.text_translation_result.translation
                    print(f"\nPartial translation: {translation}")
        except Exception as e:
            print("Error in Media Translation API:", e)


@app.websocket("/")
async def audio_socket(websocket: WebSocket):
    await websocket.accept()
    print('websocket.accept')
    ctx = multiprocessing.get_context()
    in_queue = ctx.Queue()
    out_queue = ctx.Queue()
    process = ctx.Process(target=translation_worker, args=(in_queue, out_queue))
    process.start()

    async def receive_audio():
        while True:
            # RECEIVE
            audio_bytes: bytes = await websocket.receive_bytes()
            in_queue.put(audio_bytes)

    async def send_audio():
        while True:
            # SEND
            # Check if there's audio to send
            while not out_queue.empty():
                audio = out_queue.get()
                await websocket.send_bytes(audio)
            await asyncio.sleep(0.1)  # Prevent tight loop when there's nothing to send

    receive_task = asyncio.create_task(receive_audio())
    send_task = asyncio.create_task(send_audio())

    try:
        await asyncio.gather(receive_task, send_task)
    except Exception as e:
        print("Error in socket:", e)
    finally:
        # Wait for the worker to finish
        in_queue.close()
        in_queue.join_thread()
        out_queue.close()
        out_queue.join_thread()
        # use terminate so the while True loop in process will exit
        process.terminate()
        process.join()

    print('leave websocket_endpoint')


if __name__ == '__main__':
    # When using spawn you should guard the part that launches the job in if __name__ == '__main__':.
    # `set_start_method` should also go there, and everything will run fine.
    try:
        set_start_method('spawn')
    except RuntimeError as e:
        print("Runtime error:", e)

    uvicorn.run('api:app', host='0.0.0.0')
