import itertools
import multiprocessing
import asyncio
from multiprocessing import set_start_method
from multiprocessing.queues import Queue

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket
from google.cloud import mediatranslation as media
from google.cloud.mediatranslation_v1beta1 import StreamingTranslateSpeechResponse
from typing import Iterable, Callable

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
            audio_config=speech_config
        )

        # The first request contains the configuration.
        # Note that audio_content is explicitly set to None.
        first_request = media.StreamingTranslateSpeechRequest(streaming_config=config)
        print("Creted first request")

        requests = itertools.chain(iter([first_request]), audio_generator(q))
        print("Created requests iterator")

        responses = client.streaming_translate_speech(requests)
        print("Created responses from request")

        # Use the translation responses as they arrive
        # out_queue.put(response for response in responses)
        # asyncio.run(send_translation(responses))
        for response in responses:
            result = response.result
            translation = result.text_translation_result.translation

            if result.text_translation_result.is_final:
                print(f"\nFinal translation: {translation}")
            else:
                print(f"\nPartial translation: {translation}")
        print(f"Finished translation worker")

    except Exception as e:
        print("Error:", e)


@app.websocket("/")
async def audio_socket(websocket: WebSocket):
    await websocket.accept()
    print('websocket.accept')
    ctx = multiprocessing.get_context()
    # async def send_translation(q: Queue):
    #     response = q.get()
    #     translation = response.result.text_translation_result.translation
    #     print(f"\nPartial translation: {translation}")
    #     await websocket.send(translation)
    queue = ctx.Queue()
    out_queue = ctx.Queue()
    process = ctx.Process(target=translation_worker, args=(queue, ))
    process.start()
    # translation_sender = ctx.Process(target=send_translation, args=(out_queue, ))
    # translation_sender.start()
    # asyncio.run(send_translation(out_queue))
    try:
        while True:
            audio_bytes: bytes = await websocket.receive_bytes()
            queue.put(audio_bytes)
    except Exception as e:
        print("Error in socket:", e)
    finally:
        # Wait for the worker to finish
        queue.close()
        queue.join_thread()
        out_queue.close()
        out_queue.join_thread()
        # use terminate so the while True loop in process will exit
        process.terminate()
        process.join()
        # translation_sender.terminate()
        # translation_sender.join()

    print('leave websocket_endpoint')


if __name__ == '__main__':
    # When using spawn you should guard the part that launches the job in if __name__ == '__main__':.
    # `set_start_method` should also go there, and everything will run fine.
    try:
        set_start_method('spawn')
    except RuntimeError as e:
        print("Runtime error:", e)

    uvicorn.run('api:app', host='0.0.0.0')
