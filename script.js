class FactCheckerApp {
    constructor() {
        this.apiUrl = 'http://localhost:5000';
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.textInput = document.getElementById('textInput');
        this.factCheckBtn = document.getElementById('factCheckBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.loadingSection = document.getElementById('loadingSection');
        this.resultsSection = document.getElementById('resultsSection');
        this.resultsContainer = document.getElementById('resultsContainer');
    }

    bindEvents() {
        this.factCheckBtn.addEventListener('click', () => this.handleFactCheck());
        this.clearBtn.addEventListener('click', () => this.handleClear());
        
        // Allow Enter+Ctrl to trigger fact check
        this.textInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.handleFactCheck();
            }
        });
    }

    async handleFactCheck() {
        const text = this.textInput.value.trim();
        
        if (!text) {
            alert('Please enter some text to fact-check!');
            return;
        }

        this.showLoading();
        
        try {
            const response = await fetch(`${this.apiUrl}/fact-check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: text })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.displayResults(data);
            
        } catch (error) {
            console.error('Fact-check error:', error);
            this.showError('Failed to fact-check. Please check your connection and try again.');
        } finally {
            this.hideLoading();
        }
    }

    handleClear() {
        this.textInput.value = '';
        this.hideResults();
        this.textInput.focus();
    }

    showLoading() {
        this.loadingSection.classList.remove('hidden');
        this.resultsSection.classList.add('hidden');
        this.factCheckBtn.disabled = true;
    }

    hideLoading() {
        this.loadingSection.classList.add('hidden');
        this.factCheckBtn.disabled = false;
    }

    hideResults() {
        this.resultsSection.classList.add('hidden');
    }

    displayResults(data) {
        this.resultsContainer.innerHTML = '';
        
        if (!data.fact_check_results || data.fact_check_results.length === 0) {
            this.resultsContainer.innerHTML = '<p>No factual claims found to verify.</p>';
        } else {
            data.fact_check_results.forEach((result, index) => {
                const claimElement = this.createClaimElement(result, index + 1);
                this.resultsContainer.appendChild(claimElement);
            });
        }
        
        this.resultsSection.classList.remove('hidden');
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    createClaimElement(result, index) {
        const div = document.createElement('div');
        const verdict = result.result.verdict.toLowerCase();
        const verdictClass = this.getVerdictClass(verdict);
        
        div.className = `claim-result ${verdictClass}`;
        div.innerHTML = `
            <div class="claim-text">
                <strong>Claim ${index}:</strong> ${result.claim}
            </div>
            
            <div class="verdict ${verdictClass}">
                ${result.result.verdict}
            </div>
            
            <div class="confidence">
                <i class="fas fa-chart-bar"></i>
                <strong>Confidence:</strong> ${result.result.confidence}%
            </div>
            
            <div class="explanation">
                <i class="fas fa-info-circle"></i>
                <strong>Analysis:</strong> ${result.result.explanation}
            </div>
            
            ${result.result.sources && result.result.sources.length > 0 ? `
                <div class="sources">
                    <i class="fas fa-link"></i>
                    <strong>Sources:</strong> ${result.result.sources.join(', ')}
                </div>
            ` : ''}
        `;
        
        return div;
    }

    getVerdictClass(verdict) {
        if (verdict.includes('true') && !verdict.includes('false')) {
            return 'true';
        } else if (verdict.includes('false')) {
            return 'false';
        } else if (verdict.includes('partial')) {
            return 'partial';
        }
        return 'partial';
    }

    showError(message) {
        this.resultsContainer.innerHTML = `
            <div class="claim-result false">
                <div class="explanation">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Error:</strong> ${message}
                </div>
            </div>
        `;
        this.resultsSection.classList.remove('hidden');
    }
}

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', () => {
    new FactCheckerApp();
});
