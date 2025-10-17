import spacy
import PyPDF2
import io
from bertopic import BERTopic
from sentence_transformers import SentenceTransformer
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
import nltk
import json
import re

class DocumentAnalyzer:
    def __init__(self):
        self.nlp = spacy.load("en_core_web_sm")
        self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        nltk.download('stopwords')
        nltk.download('punkt')
        
        self.stop_words = set(stopwords.words('english'))
        custom_stops = {
            'explain', 'describe', 'discuss', 'write', 'what', 'how', 'why',
            'define', 'marks', 'mark', 'question', 'answer', 'briefly', 'detail'
        }
        self.stop_words.update(custom_stops)
        
        self.topic_model = BERTopic(
            embedding_model=self.sentence_model,
            min_topic_size=2,
            nr_topics=5
        )

    def extract_text_from_pdf(self, pdf_file):
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_file.read()))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text
        except Exception as e:
            print(f"Error reading PDF: {e}")
            return ""

    def clean_text(self, text):
        tokens = word_tokenize(text.lower())
        tokens = [
            token for token in tokens 
            if token not in self.stop_words 
            and token.isalnum() 
            and len(token) > 2
        ]
        return ' '.join(tokens)

    def extract_key_terms(self, text):
        doc = self.nlp(text)
        key_terms = []
        
        for chunk in doc.noun_chunks:
            if not any(word.text.lower() in self.stop_words for word in chunk):
                key_terms.append(chunk.text.lower())
        
        for token in doc:
            if (token.pos_ in ['NOUN', 'PROPN'] and 
                token.text.lower() not in self.stop_words and
                len(token.text) > 2):
                key_terms.append(token.text.lower())
        
        return list(set(key_terms))

    def analyze_document(self, text):
        cleaned_text = self.clean_text(text)
        key_terms = self.extract_key_terms(text)
    
    # Skip topic modeling for single documents
        topics = {}
        try:
        # Create a small set of similar texts by splitting the document
        # This is a workaround for single document analysis
            sentences = text.split('.')
            if len(sentences) > 3:  # Only attempt if we have enough sentences
                topics, _ = self.topic_model.fit_transform(sentences)
        except Exception as e:
            print(f"Topic modeling skipped: {str(e)}")
            topics = {}
    
        return {
            'key_terms': key_terms,
            'topics': topics
        }

    def compare_with_reference(self, text, reference_terms):
        doc_terms = set(self.extract_key_terms(text))
        ref_terms = set(reference_terms)
        matching_terms = doc_terms.intersection(ref_terms)
        return list(matching_terms)

    def save_reference_terms(self, terms, filename='reference_terms.json'):
        with open(filename, 'w') as f:
            json.dump(terms, f)

    def load_reference_terms(self, filename='reference_terms.json'):
        try:
            with open(filename, 'r') as f:
                return json.load(f)
        except:
            return []
