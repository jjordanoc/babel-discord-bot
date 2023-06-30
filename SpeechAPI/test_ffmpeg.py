from youtubesearchpython import Search
import yt_dlp as youtube_dl

song = input("Name of the song: ")

allSearch = Search(song, limit=1)

title = allSearch.result()["result"][0]["title"]
print(f"Title:   {title}")
link = allSearch.result()["result"][0]["link"]
print(f"Link:    {link}")
YDL_OPTIONS = {'format': 'bestaudio',
               'outtmpl': 'song',
               'postprocessors': [{
                   'key': 'FFmpegExtractAudio',
                   'preferredcodec': 'opus',
                   'preferredquality': '192',
               }]
               }

with youtube_dl.YoutubeDL(YDL_OPTIONS) as ydl:
    info = ydl.extract_info(link, download=True)
    url = info["original_url"]
    url2 = info["formats"][0]["url"]
    print(url)
    print(url2)
