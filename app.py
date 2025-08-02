from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv
import json
import time

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Perplexity API configuration
PERPLEXITY_API_KEY = os.getenv('PERPLEXITY_API_KEY')
PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions"

class FactChecker:
    def __init__(self):
        self.api_key = PERPLEXITY_API_KEY
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def extract_claims(self, text):
        """Extract factual claims from user input"""
        prompt = f"""
        Extract all factual claims from this text that can be fact-checked. 
        Return only the claims as a numbered list, nothing else:
        
        Text: {text}
        """
        
        try:
            response = requests.post(
                PERPLEXITY_URL,
                headers=self.headers,
                json={
                    "model": "sonar-pro",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 300
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                claims_text = result['choices'][0]['message']['content']
                # Parse numbered list into array
                claims = [line.strip() for line in claims_text.split('\n') 
                         if line.strip() and any(char.isdigit() for char in line[:3])]
                return claims
            return ["Unable to extract claims"]
            
        except Exception as e:
            return [f"Error extracting claims: {str(e)}"]
    
    def fact_check_claim(self, claim):
        """Fact-check a single claim using Sonar API"""
        prompt = f"""
        Fact-check this claim with high accuracy. Provide:
        1. Verdict (TRUE/FALSE/PARTIALLY TRUE/INSUFFICIENT EVIDENCE)
        2. Confidence level (0-100%)
        3. Brief explanation (2-3 sentences)
        4. Key sources used
        
        Claim: {claim}
        
        Format your response as JSON with keys: verdict, confidence, explanation, sources
        """
        
        try:
            response = requests.post(
                PERPLEXITY_URL,
                headers=self.headers,
                json={
                    "model": "sonar-pro",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 500
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                fact_check_result = result['choices'][0]['message']['content']
                
                # Try to parse as JSON, fallback to structured text
                try:
                    return json.loads(fact_check_result)
                except:
                    return {
                        "verdict": "ANALYSIS COMPLETE",
                        "confidence": 75,
                        "explanation": fact_check_result,
                        "sources": ["Perplexity Sonar Analysis"]
                    }
            
            return {
                "verdict": "ERROR",
                "confidence": 0,
                "explanation": "Failed to verify claim",
                "sources": []
            }
            
        except Exception as e:
            return {
                "verdict": "ERROR",
                "confidence": 0,
                "explanation": f"Error: {str(e)}",
                "sources": []
            }

# Initialize fact checker
fact_checker = FactChecker()

@app.route('/')
def home():
    return jsonify({
        "message": "AI Fact-Checker API is running!",
        "endpoints": ["/fact-check", "/health"]
    })

@app.route('/health')
def health_check():
    return jsonify({"status": "healthy", "timestamp": time.time()})

@app.route('/fact-check', methods=['POST'])
def fact_check():
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400
        
        input_text = data['text']
        
        # Extract claims from input text
        claims = fact_checker.extract_claims(input_text)
        
        # Fact-check each claim
        results = []
        for claim in claims:
            if claim.strip():
                fact_check_result = fact_checker.fact_check_claim(claim)
                results.append({
                    "claim": claim,
                    "result": fact_check_result
                })
        
        return jsonify({
            "original_text": input_text,
            "claims_found": len(results),
            "fact_check_results": results,
            "timestamp": time.time()
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
