import logging
import uuid
import pyogg

"""
Source: https://github.com/Honghe/demo_fastapi_websocket/blob/master/src/main.py
"""

from fastapi import FastAPI, WebSocket
import multiprocessing
from multiprocessing import set_start_method
from multiprocessing.queues import Queue
import os
import wave
import time
import uvicorn

import itertools

from google.cloud import mediatranslation as media
import pyaudio
from dotenv import load_dotenv

import io
import audioread

load_dotenv()

# Audio recording parameters
RATE = 16000
CHUNK = int(RATE / 10)  # 100ms
SpeechEventType = media.StreamingTranslateSpeechResponse.SpeechEventType

app = FastAPI()


def generator(q: Queue):
    while True:
        # print("Generating bytes from queue...")
        data_bytes: bytes = q.get()
        yield media.StreamingTranslateSpeechRequest(audio_content=data_bytes)


def translation_worker(q: Queue):
    print("Started worker")
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
            audio_config=speech_config, single_utterance=True
        )

        # The first request contains the configuration.
        # Note that audio_content is explicitly set to None.
        first_request = media.StreamingTranslateSpeechRequest(streaming_config=config)
        print("Creted first request")

        # audio_generator = generator(q)
        # mic_requests = (
        #     media.StreamingTranslateSpeechRequest(audio_content=content)
        #     for content in audio_generator
        # )

        requests = itertools.chain(iter([first_request]), generator(q))
        print("Created requests iterator")

        responses = client.streaming_translate_speech(requests)
        print("Created responses from request")

        # Print the translation responses as they arrive
        result = listen_print_loop(responses)
        print(f"Finished translation worker with result ${result}...")

    except Exception as e:
        print("Error:", e)


def listen_print_loop(responses):
    """Iterates through server responses and prints them.

    The responses passed is a generator that will block until a response
    is provided by the server.
    """
    translation = ""
    for response in responses:
        # Once the transcription settles, the response contains the
        # END_OF_SINGLE_UTTERANCE event.
        if response.speech_event_type == SpeechEventType.END_OF_SINGLE_UTTERANCE:
            print(f"\nFinal translation: {translation}")
            return 0

        result = response.result
        translation = result.text_translation_result.translation

        print(f"\nPartial translation: {translation}")


@app.websocket("/")
async def audio_socket(websocket: WebSocket):
    await websocket.accept()
    print('websocket.accept')

    ctx = multiprocessing.get_context()
    queue = ctx.Queue()
    process = ctx.Process(target=translation_worker, args=(queue,))
    process.start()
    counter = 0

    try:
        while True:
            audio_bytes: bytes = await websocket.receive_bytes()
            # print(audio_bytes)
            queue.put(audio_bytes)
            counter += 1
    except Exception as e:
        print("Error in socket:", e)
    finally:
        # Wait for the worker to finish
        queue.close()
        queue.join_thread()
        # use terminate so the while True loop in process will exit
        process.terminate()

    print('leave websocket_endpoint')


if __name__ == '__main__':
    # When using spawn you should guard the part that launches the job in if __name__ == '__main__':.
    # `set_start_method` should also go there, and everything will run fine.
    try:
        set_start_method('spawn')
    except RuntimeError as e:
        print("Runtime error:", e)

    uvicorn.run('api:app', host='0.0.0.0')
