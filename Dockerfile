# pull official base image
FROM python:3.11

# set working directory
WORKDIR /app

# install app dependencies
COPY SpeechAPI/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# add app
COPY SpeechAPI .

# expose api running port
EXPOSE 8000

# run api
CMD ["python3", "api.py"]
