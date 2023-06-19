from .api import app
import websockets
from unittest import TestCase

# class ApiTest(TestCase):
#     async def test_websocket(self):
#         response = {}
#         async with websockets.connect('ws://0.0.0.0:8000/') as websocket:
#             await websocket.send(b'')
#
#         assert response == {}

import pytest
import httpx
from fastapi.testclient import TestClient

@pytest.mark.asyncio
async def test_websocket():
    async with websockets.connect("ws://localhost:8000") as websocket:
        await websocket.send(b'/3f/6f/ff/3f/2e/')
        assert 1 == 1

