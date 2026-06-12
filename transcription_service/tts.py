import sys
from TTS.api import TTS

text = sys.argv[1]
output_file = sys.argv[2]

tts = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC")
tts.tts_to_file(text=text, file_path=output_file)