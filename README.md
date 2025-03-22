# Talk2DHand: A Real-time Interactive Sign Language Education System Using MediaPipe Landmarks, Deep Learning, and Natural Language Processing

## Authors
[Kazzandra Virtudez](https://github.com/kavirtudez),
[Francesca Tuazon](https://github.com/neinzaut),
[Eloiza Lumakang](https://github.com/ejlumakang)

## Overview

Communication gaps persist between deaf and hearing individuals. Many hearing individuals aren't proficient in sign language. Traditional methods of learning sign language often fail to engage users or provide sufficient interactive practice, leading to slow progress and frustration.
In this project, we aim to build a real-time interactive sign language education system to help sign and non-sign language users in learning American Sign Language (ASL). It will solely focus on the sign language alphabet, which provides users with a starting point in learning and practicing the basics of ASL.The web-based system will use NLP techniques such as speech recognition, text processing, text-to-image mapping, and text normalization.

## Dataset
The dataset used for training the model is the [American Sign Language Dataset](https://www.kaggle.com/datasets/ayuraj/asl-dataset) for Image Classification from Kaggle. It contains 2,515 image files of numbers from 0-9 and letters from A-Z.

## Getting Started

### Dependencies

* To set up the environment for our project, you need to install the following dependencies. These are listed in the requirements.txt file, which includes:

```
Flask==3.0.3
keras==3.5.0
tensorflow==2.17.0
numpy==1.26.3
opencv-python==4.10.0.84
mediapipe==0.10.14
pandas==2.2.0
matplotlib==3.8.2
beautifulsoup4==4.12.3
PyAudio==0.2.14
SpeechRecognition==3.10.4
```
* You can install these dependencies using the following command:
```
pip install -r requirements.txt
```


## NLP Concepts

### 1. Speech Recognition Functionality
* The application leverages the SpeechRecognition library to convert spoken language (audio input) into text. Specifically, it uses Google's speech recognition service to achieve this.
```
@app.route('/speech_recognition', methods=['GET'])
   def speech_recognition():
       try:
           while True:
               with sr.Microphone() as source:
                   print("Say something...")
                   audio = recognizer.listen(source, timeout=5, phrase_time_limit=5)
               text = recognizer.recognize_google(audio, language="en-US")
               print(f"The computer heard: {text}")
               ...
```
* **Why This is NLP**:
   * Speech recognition is a classic NLP task that involves converting spoken language (audio signals) into written text. It combines signal processing with natural language understanding.
   * The key NLP aspect here is the recognition of phonemes, words, and sentences in audio input and mapping them to textual representations.
   * It aligns with one of the fundamental tasks in NLP, where unstructured input (speech) is processed to derive meaningful, structured text.
   * Tools like Google Speech-to-Text implement acoustic models and language models to perform the transcription, which are core NLP models.
* **Validation Points**:
   * Speech recognition models are built using NLP pipelines that include linguistic models for phoneme-to-word conversion.
   * Recognizing phrases like "Say something..." and turning them into coherent text involves semantic and syntactic processing.
   * This step serves as an input to further NLP processes, making it an integral part of a larger NLP pipeline.

### 2. Text Processing
* After converting speech to text, the application processes the recognized text to identify the context or intent, specifically checking if the input starts with "letter" or "number".
```
if text.lower().startswith("letter "):
       character = text.split()[1].lower()
       ...
   elif text.lower().startswith("number "):
       character = text.split()[1].lower()
       ...
```
* **Why This is NLP**:
   * The startsWith() check and subsequent parsing (splitting text) involve basic syntactic analysis. Parsing text into components like keywords (e.g., "letter") and values (e.g., "a" or "1") demonstrates text understanding.
   * Recognizing whether the input mentions a "letter" or "number" is a form of intent recognition, which is a key NLP task used in many applications such as chatbots and virtual assistants.
   * The ability to extract structured data (e.g., specific letters or numbers) from natural language text is an essential part of information extraction.
* **Validation Points**:
   * Intent recognition involves parsing textual data and understanding its structure or meaning, which is a well-established NLP task.
   * The operation of identifying specific keywords and extracting related information aligns with semantic parsing and entity recognition in NLP.
   * This step transforms natural language into actionable data, which is at the heart of many NLP applications.

### 3. Text-to-Image Mapping
* The recognized text (letters or numbers) is mapped to specific images using a dictionary. This involves associating semantic meaning in text with corresponding visual representations.
```
letter_to_image = {
       'a': 'static/images/Hand signs/a.png',
       'b': 'static/images/Hand signs/b.png',
       ...
   }

```
* **Why This is NLP**:
   * The mapping between text ("a", "b") and images reflects semantic understanding, where textual symbols are associated with meaning (images representing hand signs).
   * NLP tasks often involve transforming natural language into non-textual outputs, such as generating images, speech, or actions. This is particularly relevant in multimodal NLP, which bridges natural language with other modalities like images or audio.
   * Understanding that "a" maps to a specific image requires processing and assigning meaning to the recognized text, which is core to NLP.
* **Validation Points**:
   * Text-to-image mapping is part of semantic association, a key task in NLP applications like multimodal systems (e.g., vision-language models).
   * Modern NLP often integrates with computer vision, where text is used as input to retrieve or generate corresponding visual data.
   * Though the mapping here is dictionary-based, it still relies on natural language input for correct retrieval, validating its place in NLP.

### 4. User Input Handling (Text Normalization)
* The application processes text inputs from users (e.g., their names) by converting the input to lowercase and generating image URLs based on the individual letters in the name.
```
user_name = request.form['username'].lower()  # Get the name from the form and convert it to lowercase
```
* **Why This is NLP**:
   * Text normalization (e.g., converting text to lowercase) is a preprocessing step in NLP pipelines. It ensures consistency in text data, which is critical for downstream NLP tasks such as tokenization, parsing, and entity recognition.
   * Breaking the text into individual letters and mapping each to corresponding resources (images) aligns with character-level text processing, often seen in tasks like spelling correction or handwriting recognition.
* **Validation Points**:
   * Normalization is a core preprocessing step in NLP. Tasks such as machine translation, text classification, and information retrieval all rely on normalized text.
   * Character-level text processing (as demonstrated here) is a form of syntactic analysis, where input is broken down into smaller units for further understanding.
   * The mapping of normalized text to structured outputs (image URLs) reflects a semantic association process similar to intent-based NLP systems.

## Conclusion
Each of the functionalities described—speech recognition, text processing, text-to-image mapping, and text normalization—involves aspects of natural language processing:
1. **Speech Recognition** converts speech into text, which is a fundamental NLP task.
2. **Text Processing** performs syntactic analysis and intent recognition.
3. **Text-to-Image Mapping** represents semantic understanding and multimodal NLP.
4. **User Input Handling** applies text normalization and character-level processing.
These tasks collectively showcase how NLP processes unstructured language input, extracts meaning, and uses it to trigger actions or generate outputs. The integration of these functionalities demonstrates a clear NLP pipeline, validating their classification as NLP tasks.
