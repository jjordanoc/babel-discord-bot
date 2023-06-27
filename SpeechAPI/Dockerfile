# pull official base image
FROM python:3.11

# set working directory
WORKDIR /app

# install os dependencies
RUN apt-get update
RUN apt-get install libasound-dev libportaudio2 libportaudiocpp0 portaudio19-dev -y
RUN pip install pyaudio

# install app dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# add app
COPY . .

# run api
CMD ["python3", "api.py"]
