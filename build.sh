#!/usr/bin/env bash
# exit on error
set -o errexit

# Install system dependencies for PyAudio
apt-get update
apt-get install -y portaudio19-dev python3-pyaudio ffmpeg libsm6 libxext6 libgl1

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt 