from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from analyzer import DocumentAnalyzer
from quiz_generator import InteractiveQuiz
import json

quiz_generator = InteractiveQuiz()

app = Flask(__name__)

# Add CORS headers right after creating the Flask app
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Initialize analyzers
document_analyzer = DocumentAnalyzer()
quiz_generator = InteractiveQuiz()  # Add this line to initialize quiz generator

# Configure Gemini
genai.configure(api_key='AIzaSyART7oaAzemGL3hthq6mIgOFRaqjcCkSxc')
model = genai.GenerativeModel('gemini-1.5-flash')

# Store analyzed text for quiz generation
analyzed_text = ""

@app.route("/analyze-reference", methods=["POST"])
def analyze_reference_documents():
    if "file" not in request.files:
        return jsonify({"error": "No files provided"}), 400
    
    files = request.files.getlist("file")
    if not files:
        return jsonify({"error": "No files selected"}), 400
    
    all_terms = set()
    
    try:
        for file in files:
            if file.filename:  # Skip if filename is empty
                text = document_analyzer.extract_text_from_pdf(file)
                analysis = document_analyzer.analyze_document(text)
                all_terms.update(analysis['key_terms'])
        
        # Save the terms
        document_analyzer.save_reference_terms(list(all_terms))
        
        return jsonify({
            "message": "Reference documents analyzed successfully",
            "terms": list(all_terms)
        })
    
    except Exception as e:
        print(f"Error processing files: {str(e)}")  # Add logging
        return jsonify({"error": str(e)}), 500

@app.route("/analyze", methods=["POST"])
def analyze_document():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    
    try:
        # Extract text from PDF
        text = document_analyzer.extract_text_from_pdf(file)
        
        # Store text for quiz generation
        global analyzed_text
        analyzed_text = text
        
        # Get reference terms and find matches
        reference_terms = document_analyzer.load_reference_terms()
        matching_terms = document_analyzer.compare_with_reference(text, reference_terms)
        
        prompt = f"""
        Please provide a comprehensive summary of the following text in bullet points. Focus on these key terms: {', '.join(matching_terms)}.
        For each bullet point:
        - Start with a hyphen (-)
        - Include one main concept or idea
        - Explain how the terms are used and their significance
        - Keep each point concise and clear

        Text to analyze:
        {text}
        
        Format each point starting with a hyphen (-) on a new line.
        """
        
        response = model.generate_content(prompt)
        summary = response.text
        
        # Process summary to ensure proper bullet points
        summary_points = [point.strip() for point in summary.split('\n') 
                         if point.strip() and point.strip().startswith('-')]
        
        return jsonify({
            "summary": summary_points,  # Now sending an array of points
            "matching_terms": matching_terms,
            "text_length": len(text)
        })
    
    except Exception as e:
        print(f"Error processing file: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/generate-quiz", methods=["GET"])
def generate_quiz():
    global analyzed_text
    try:
        if not analyzed_text:
            print("No analyzed text available")
            return jsonify({"error": "No document has been analyzed yet"}), 400
            
        print("Generating questions from text of length:", len(analyzed_text))
        questions = quiz_generator.generate_questions(analyzed_text, num_questions=5)
        print("Generated questions:", len(questions))
        
        if not questions:
            print("No questions could be generated")
            return jsonify({"error": "Could not generate questions from the text"}), 400
            
        return jsonify({
            "questions": questions,
            "total_questions": len(questions)
        })
    except Exception as e:
        print(f"Error generating quiz: {str(e)}")
        return jsonify({"error": f"Quiz generation failed: {str(e)}"}), 500

@app.route("/submit-quiz", methods=["POST"])
def submit_quiz():
    try:
        data = request.json
        if not data or 'answers' not in data:
            return jsonify({"error": "No answers provided"}), 400
            
        answers = data['answers']
        results = quiz_generator.grade_answers(answers)
        
        return jsonify(results)
    except Exception as e:
        print(f"Error processing quiz submission: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)