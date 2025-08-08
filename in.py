import os
import urllib.request
import zipfile

# Save in current directory
current_dir = os.getcwd()

# --- Download ffmpeg (Windows build) ---
print("Downloading FFmpeg...")
ffmpeg_zip_url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
ffmpeg_zip_path = os.path.join(current_dir, "ffmpeg.zip")

urllib.request.urlretrieve(ffmpeg_zip_url, ffmpeg_zip_path)

# Extract ffmpeg.exe to current directory
print("Extracting ffmpeg.exe...")
with zipfile.ZipFile(ffmpeg_zip_path, 'r') as zip_ref:
    for name in zip_ref.namelist():
        if name.endswith("ffmpeg.exe"):
            zip_ref.extract(name, current_dir)
            extracted_path = os.path.join(current_dir, name)
            final_path = os.path.join(current_dir, "ffmpeg.exe")
            os.rename(extracted_path, final_path)
            break

# Clean up zip file
os.remove(ffmpeg_zip_path)

# --- Download yt-dlp.exe ---
print("Downloading yt-dlp.exe...")
yt_dlp_url = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
yt_dlp_path = os.path.join(current_dir, "yt-dlp.exe")

urllib.request.urlretrieve(yt_dlp_url, yt_dlp_path)

