import torch
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM, AutoModelForCausalLM
import whisper
import tempfile
import os


# # Load tokenizer and model (this example uses 'gpt2' – you can change it)
# model_id = "tiiuae/falcon-7b-instruct"

# tokenizer = AutoTokenizer.from_pretrained(model_id)
# model = AutoModelForCausalLM.from_pretrained(
#     model_id,
#     torch_dtype=torch.float32,  # Use float32 for CPU
#     device_map={"": "cpu"}      # Force CPU
# )

# # Create a pipeline for text generation
# response_generator = pipeline("text-generation", model=model, tokenizer=tokenizer)


# Grammar correction function
def correct_grammar(text):
    
    # Load tokenizer and model
    grammar_tokenizer = AutoTokenizer.from_pretrained("vennify/t5-base-grammar-correction")
    grammar_model = AutoModelForSeq2SeqLM.from_pretrained("vennify/t5-base-grammar-correction")

    input_text = "grammar: " + text
    input_ids = grammar_tokenizer.encode(input_text, return_tensors="pt", max_length=512, truncation=True)

    with torch.no_grad():
        outputs = grammar_model.generate(
            input_ids,
            max_length=128,
            num_beams=5,
            early_stopping=True
        )

    corrected_text = grammar_tokenizer.decode(outputs[0], skip_special_tokens=True)
    print(f"Original: {text}\nCorrected: {corrected_text}")
    return corrected_text

def generate_ai_response(prompt):
    try:
        print(f"Generating response for prompt: {prompt}")
        inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
        print(f"Inputs: {inputs}")

        print("Before generation...")
        outputs = model.generate(
            **inputs,
            max_new_tokens=40,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            pad_token_id=tokenizer.eos_token_id
        )
        print("After generation...")
        print(f"Outputs: {outputs}")

        generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        return generated_text.strip()
    except Exception as e:
        print(f"Error generating response: {e}")
        return "Sorry, I couldn't generate a response at this time."


def transcribe_audio(file_path):
    result = whisper_model.transcribe(file_path)
    return result["text"].strip()
