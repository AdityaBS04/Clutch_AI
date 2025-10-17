import random
from typing import List, Dict
import re
import spacy
from nltk.tokenize import sent_tokenize

class InteractiveQuiz:
    def __init__(self):
        self.nlp = spacy.load("en_core_web_sm")
        self.topics_to_revise = set()

    def extract_topics(self, text: str) -> List[str]:
        """Extract main topics from the text."""
        doc = self.nlp(text)
        # Find noun phrases that are likely to be technical terms
        topics = []
        for chunk in doc.noun_chunks:
            # Look for technical or domain-specific terms
            if (any(token.pos_ in ['NOUN', 'PROPN'] for token in chunk) and
                len(chunk.text.split()) <= 3 and  # Limit phrase length
                not any(char.isdigit() for char in chunk.text)):  # Exclude numbers
                topics.append(chunk.text.lower())
        
        # Filter out common/basic words
        return list(set([t for t in topics if len(t.split()) > 1 or len(t) > 5]))

    def generate_true_false_question(self, sentence: str, topics: List[str]) -> Dict:
        """Generate a true/false question by modifying key information."""
        doc = self.nlp(sentence)
        
        # Create a false statement by modifying topic-related information
        relevant_topics = [topic for topic in topics if topic in sentence.lower()]
        if not relevant_topics:
            return None
            
        topic = random.choice(relevant_topics)
        opposite_statements = {
            "increases": "decreases",
            "improves": "reduces",
            "essential": "optional",
            "required": "optional",
            "always": "never",
            "never": "always",
            "high": "low",
            "low": "high",
            "better": "worse",
            "worse": "better"
        }
        
        # Create altered version
        modified_sentence = sentence
        is_true = random.choice([True, False])
        
        if not is_true:
            # Modify the sentence to make it false
            for word, opposite in opposite_statements.items():
                if word in sentence.lower():
                    modified_sentence = sentence.replace(word, opposite)
                    break
        
        return {
            'type': 'true_false',
            'question': modified_sentence,
            'correct_answer': is_true,
            'topic': topic
        }

    def generate_mcq(self, sentence: str, topics: List[str]) -> Dict:
        """Generate a multiple-choice question about key topics."""
        relevant_topics = [topic for topic in topics if topic in sentence.lower()]
        if not relevant_topics:
            return None
            
        topic = random.choice(relevant_topics)
        question_text = sentence.replace(topic, "_____")
        
        # Generate distractors that are related to the domain
        other_topics = [t for t in topics if t != topic and len(t.split()) == len(topic.split())]
        options = random.sample(other_topics, min(3, len(other_topics))) if len(other_topics) >= 3 else []
        
        while len(options) < 3:
            # If we don't have enough related terms, use other relevant topics
            fake_option = random.choice(topics)
            if fake_option not in options and fake_option != topic:
                options.append(fake_option)
        
        options.append(topic)
        random.shuffle(options)
        
        return {
            'type': 'mcq',
            'question': question_text,
            'options': options,
            'correct_answer': topic,
            'topic': topic
        }

    def process_text(self, text: str) -> List[str]:
        """Split text into sentences and filter for topic-related content."""
        sentences = sent_tokenize(text)
        # Find sentences that contain key topics
        topics = self.extract_topics(text)
        topic_sentences = [
            s for s in sentences 
            if any(topic in s.lower() for topic in topics)
            and 10 <= len(s.split()) <= 30  # Keep reasonably sized sentences
        ]
        return topic_sentences, topics

    def generate_questions(self, text: str, num_questions: int = 5) -> List[Dict]:
        """Generate quiz questions focusing on key topics."""
        sentences, topics = self.process_text(text)
        if not sentences or not topics:
            return []
            
        questions = []
        question_types = ['mcq', 'true_false']
        
        while len(questions) < num_questions and sentences:
            sentence = random.choice(sentences)
            question_type = random.choice(question_types)
            
            if question_type == 'mcq':
                question = self.generate_mcq(sentence, topics)
            else:
                question = self.generate_true_false_question(sentence, topics)
                
            if question:
                question['id'] = len(questions) + 1
                questions.append(question)
                sentences.remove(sentence)  # Avoid reusing the same sentence
        
        return questions[:num_questions]

    def grade_answers(self, answers: List[Dict]) -> Dict:
        """Grade answers and track topics to review."""
        if not answers:
            return {
                'score': 0,
                'total': 0,
                'percentage': 0,
                'topics_to_review': []
            }
        
        correct_count = 0
        topics_to_review = set()
        
        for answer in answers:
            is_correct = answer.get('selected_answer') == answer.get('correct_answer')
            if is_correct:
                correct_count += 1
            else:
                topic = answer.get('topic', '').capitalize()
                if topic:
                    topics_to_review.add(topic)
        
        return {
            'score': correct_count,
            'total': len(answers),
            'percentage': round((correct_count / len(answers)) * 100, 1),
            'topics_to_review': list(topics_to_review)
        }