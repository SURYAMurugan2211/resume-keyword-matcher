/* ===================================
   Resume Keyword Matcher - JavaScript
   =================================== */

// Common English stopwords to filter out
const STOPWORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have',
    'had', 'what', 'when', 'where', 'who', 'which', 'why', 'how', 'or',
    'can', 'could', 'should', 'would', 'may', 'might', 'must', 'shall',
    'am', 'been', 'being', 'do', 'does', 'did', 'doing', 'each', 'few',
    'more', 'most', 'other', 'some', 'such', 'than', 'too', 'very',
    'we', 'you', 'your', 'our', 'their', 'his', 'her', 'my', 'me',
    'him', 'them', 'us', 'she', 'i'
]);

// Keyword categories with weights
const CATEGORY_WEIGHTS = {
    skills: 0.40,      // 40% - Programming languages, soft skills
    technologies: 0.30, // 30% - Frameworks, platforms, databases
    tools: 0.20,       // 20% - Development tools, software
    roles: 0.10        // 10% - Job titles, role-specific terms
};

// Common keyword patterns for categorization
const KEYWORD_PATTERNS = {
    skills: [
        // Programming languages
        'javascript', 'python', 'java', 'typescript', 'ruby', 'php', 'swift', 'kotlin',
        'go', 'rust', 'scala', 'perl', 'bash', 'powershell', 'sql', 'html', 'css',
        // Soft skills
        'leadership', 'communication', 'teamwork', 'problem-solving', 'analytical',
        'creative', 'agile', 'scrum', 'collaboration', 'mentoring', 'training'
    ],
    technologies: [
        // Frameworks & Libraries
        'react', 'angular', 'vue', 'node', 'express', 'django', 'flask', 'spring',
        'laravel', 'rails', 'nextjs', 'gatsby', 'svelte', 'jquery', 'bootstrap',
        // Platforms & Services
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'terraform',
        // Databases
        'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch', 'dynamodb',
        'firebase', 'oracle', 'sqlserver', 'cassandra'
    ],
    tools: [
        'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence', 'slack',
        'vscode', 'intellij', 'eclipse', 'postman', 'figma', 'sketch', 'photoshop',
        'webpack', 'babel', 'npm', 'yarn', 'maven', 'gradle', 'ansible', 'puppet'
    ],
    roles: [
        'developer', 'engineer', 'architect', 'manager', 'lead', 'senior', 'junior',
        'full-stack', 'frontend', 'backend', 'devops', 'sre', 'qa', 'tester',
        'designer', 'analyst', 'consultant', 'specialist', 'coordinator'
    ]
};

// DOM Elements - cached for performance
const DOM = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Cache DOM elements once
    DOM.jobDescription = document.getElementById('job-description');
    DOM.resume = document.getElementById('resume');
    DOM.resumePdfInput = document.getElementById('resume-pdf');
    DOM.fileNameDisplay = document.getElementById('file-name');
    DOM.analyzeBtn = document.querySelector('.analyze-btn');
    DOM.clearBtn = document.querySelector('.clear-btn');
    DOM.resultsSection = document.getElementById('results-section');
    DOM.matchedKeywords = document.getElementById('matched-keywords');
    DOM.missingKeywords = document.getElementById('missing-keywords');
    DOM.highlightedResume = document.getElementById('highlighted-resume');
    DOM.resultsHeading = document.querySelector('.results-heading');

    // Hide results initially
    DOM.resultsSection.style.display = 'none';

    // Cache additional DOM elements for upload card
    DOM.uploadDropZone = document.getElementById('upload-drop-zone');
    DOM.uploadTrigger = document.getElementById('upload-trigger');
    DOM.uploadLoading = document.getElementById('upload-loading');
    DOM.uploadSuccess = document.getElementById('upload-success');
    DOM.loadingProgress = document.getElementById('loading-progress');
    DOM.successFilename = document.getElementById('success-filename');
    DOM.uploadContent = document.querySelector('.upload-content');
    DOM.pdfIcon = document.querySelector('.pdf-icon');

    // Add event listeners
    DOM.analyzeBtn.addEventListener('click', analyzeResume);
    DOM.clearBtn.addEventListener('click', clearAll);
    DOM.resumePdfInput.addEventListener('change', handlePdfUpload);
    
    // Wait for PDF.js to load before enabling upload features
    waitForPdfJs().then(() => {
        // Upload trigger button
        if (DOM.uploadTrigger) {
            DOM.uploadTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                DOM.resumePdfInput.click();
            });
        }
        
        // Click on drop zone to trigger file input
        if (DOM.uploadDropZone) {
            DOM.uploadDropZone.addEventListener('click', () => {
                if (!DOM.uploadDropZone.classList.contains('uploading')) {
                    DOM.resumePdfInput.click();
                }
            });
        }
        
        // Drag and drop functionality
        setupDragAndDrop();
        
        console.log('PDF upload features enabled');
    }).catch((error) => {
        console.error('PDF.js failed to load:', error);
        // Disable PDF upload UI
        if (DOM.uploadDropZone) {
            DOM.uploadDropZone.style.opacity = '0.5';
            DOM.uploadDropZone.style.cursor = 'not-allowed';
            DOM.uploadDropZone.innerHTML = '<p style="color: var(--text-muted); text-align: center;">PDF upload unavailable. Please paste text manually.</p>';
        }
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Enter to analyze
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            analyzeResume();
        }
        // Ctrl/Cmd + K to clear
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            clearAll();
        }
    });
    
    // Configure PDF.js worker with retry logic
    initializePdfJs();
});

/**
 * Wait for PDF.js library to load
 * @returns {Promise} - Resolves when PDF.js is loaded
 */
function waitForPdfJs() {
    return new Promise((resolve, reject) => {
        let retryCount = 0;
        const maxRetries = 5;
        
        function check() {
            if (typeof pdfjsLib !== 'undefined') {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve();
            } else if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(check, 1000);
            } else {
                reject(new Error('PDF.js not available'));
            }
        }
        check();
    });
}

/**
 * Initialize PDF.js library with retry logic
 */
function initializePdfJs() {
    let retryCount = 0;
    const maxRetries = 5;
    
    function tryInitialize() {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            console.log('✅ PDF.js initialized successfully');
            
            // Show PDF upload card
            if (DOM.uploadDropZone) {
                DOM.uploadDropZone.style.display = 'flex';
            }
            return true;
        } else if (retryCount < maxRetries) {
            retryCount++;
            console.log(`⏳ PDF.js not loaded yet, retrying... (${retryCount}/${maxRetries})`);
            setTimeout(tryInitialize, 1000);
            return false;
        } else {
            console.warn('⚠️ PDF.js failed to load - PDF upload feature disabled');
            
            // Hide PDF upload card and show info message
            if (DOM.uploadDropZone) {
                DOM.uploadDropZone.style.display = 'none';
            }
            
            // Show info toast (non-blocking)
            showInfoToast(
                'PDF Upload Unavailable',
                'PDF upload feature is currently unavailable. Please paste your resume text directly.'
            );
            
            return false;
        }
    }
    
    tryInitialize();
}

/**
 * Show toast notification
 * @param {string} title - Toast title
 * @param {string} message - Toast message
 * @param {string} type - Toast type (error, warning, success, info)
 * @param {number} duration - Duration in milliseconds (0 = no auto-dismiss)
 */
function showToast(title, message, type = 'info', duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    
    // Icon based on type
    const icons = {
        error: '❌',
        warning: '⚠️',
        success: '✅',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" aria-label="Close notification">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;
    
    // Add close button functionality
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => dismissToast(toast));
    
    // Add to container
    container.appendChild(toast);
    
    // Auto-dismiss after duration
    if (duration > 0) {
        setTimeout(() => dismissToast(toast), duration);
    }
    
    return toast;
}

/**
 * Dismiss toast notification
 * @param {HTMLElement} toast - Toast element to dismiss
 */
function dismissToast(toast) {
    if (!toast) return;
    
    toast.classList.add('toast-exit');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

/**
 * Show error toast
 * @param {string} title - Error title
 * @param {string} message - Error message
 */
function showErrorToast(title, message) {
    showToast(title, message, 'error', 7000);
}

/**
 * Show warning toast
 * @param {string} title - Warning title
 * @param {string} message - Warning message
 */
function showWarningToast(title, message) {
    showToast(title, message, 'warning', 6000);
}

/**
 * Show success toast
 * @param {string} title - Success title
 * @param {string} message - Success message
 */
function showSuccessToast(title, message) {
    showToast(title, message, 'success', 4000);
}

/**
 * Show info toast
 * @param {string} title - Info title
 * @param {string} message - Info message
 */
function showInfoToast(title, message) {
    showToast(title, message, 'info', 5000);
}

/**
 * Setup drag and drop functionality
 */
function setupDragAndDrop() {
    if (!DOM.uploadDropZone) return;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        DOM.uploadDropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        DOM.uploadDropZone.addEventListener(eventName, () => {
            DOM.uploadDropZone.classList.add('drag-over');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        DOM.uploadDropZone.addEventListener(eventName, () => {
            DOM.uploadDropZone.classList.remove('drag-over');
        }, false);
    });
    
    // Handle dropped files
    DOM.uploadDropZone.addEventListener('drop', handleDrop, false);
}

/**
 * Prevent default drag behaviors
 */
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

/**
 * Handle file drop
 */
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        DOM.resumePdfInput.files = files;
        handlePdfUpload({ target: { files: files } });
    }
}

/**
 * Show upload loading state
 */
function showUploadLoading(filename) {
    DOM.uploadDropZone.classList.add('uploading');
    DOM.uploadContent.style.display = 'none';
    DOM.pdfIcon.style.display = 'none';
    DOM.uploadSuccess.classList.remove('active');
    DOM.uploadLoading.classList.add('active');
    DOM.loadingProgress.textContent = `Processing ${filename}...`;
}

/**
 * Show upload success state
 */
function showUploadSuccess(filename, charCount) {
    DOM.uploadLoading.classList.remove('active');
    DOM.uploadSuccess.classList.add('active');
    DOM.uploadDropZone.classList.remove('uploading');
    DOM.uploadDropZone.classList.add('success');
    DOM.successFilename.textContent = `${filename} (${charCount} characters)`;
    
    // Auto-scroll to textarea after a short delay
    setTimeout(() => {
        DOM.resume.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 800);
}

/**
 * Reset upload card to initial state
 */
function resetUploadCard() {
    DOM.uploadDropZone.classList.remove('uploading', 'success');
    DOM.uploadLoading.classList.remove('active');
    DOM.uploadSuccess.classList.remove('active');
    DOM.uploadContent.style.display = 'block';
    DOM.pdfIcon.style.display = 'block';
    DOM.loadingProgress.textContent = '';
    DOM.successFilename.textContent = '';
}

/**
 * Handle PDF file upload
 * @param {Event} event - File input change event
 */
async function handlePdfUpload(event) {
    const file = event.target.files[0];
    
    if (!file) {
        return;
    }
    
    // Validate file type
    if (file.type !== 'application/pdf') {
        showErrorToast(
            'Invalid File Type',
            'Please upload a PDF file. Other formats are not supported.'
        );
        event.target.value = '';
        resetUploadCard();
        return;
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        showErrorToast(
            'File Too Large',
            `File size is ${sizeMB}MB. Maximum allowed size is 10MB. Please compress your PDF or paste the text manually.`
        );
        event.target.value = '';
        resetUploadCard();
        return;
    }
    
    // Show loading state
    showUploadLoading(file.name);
    
    try {
        // Extract and normalize text from PDF
        const text = await extractPdfText(file);
        
        // Fill the textarea with extracted text
        DOM.resume.value = text;
        
        // Show success state
        showUploadSuccess(file.name, text.length);
        showSuccessToast(
            'PDF Extracted Successfully',
            `Extracted ${text.length} characters from ${file.name}`
        );
        
        console.log('PDF text extracted successfully:', text.length, 'characters');
        
    } catch (error) {
        console.error('Error extracting PDF:', error);
        
        // Handle specific error types with appropriate messages
        switch (error.code) {
            case 'PASSWORD_PROTECTED':
                showErrorToast(
                    'Password-Protected PDF',
                    'This PDF is password-protected. Please remove the password or copy and paste the text manually.'
                );
                break;
                
            case 'INVALID_PDF':
            case 'MISSING_DATA':
                showErrorToast(
                    'Corrupted PDF File',
                    'The PDF file appears to be corrupted or invalid. Please try a different file or paste the text manually.'
                );
                break;
                
            case 'NO_TEXT':
            case 'INSUFFICIENT_TEXT':
                showWarningToast(
                    'No Text Found',
                    'This PDF appears to be image-based (scanned document). Please use OCR software or copy and paste the text manually.'
                );
                break;
                
            case 'EMPTY_FILE':
                showErrorToast(
                    'Empty PDF File',
                    'The PDF file is empty. Please upload a valid PDF with content.'
                );
                break;
                
            case 'FILE_READ_ERROR':
                showErrorToast(
                    'File Read Error',
                    'Failed to read the PDF file. The file might be corrupted or inaccessible.'
                );
                break;
                
            case 'LIBRARY_NOT_LOADED':
                showWarningToast(
                    'PDF Upload Unavailable',
                    'Please paste your resume text directly into the textarea below instead of uploading a PDF.'
                );
                break;
                
            case 'NO_PAGES':
                showErrorToast(
                    'Invalid PDF',
                    'The PDF has no pages. Please upload a valid PDF file.'
                );
                break;
                
            case 'UNEXPECTED_FORMAT':
                showWarningToast(
                    'Unexpected PDF Format',
                    'This PDF has an unusual format. Extraction may be incomplete. Please verify the results.'
                );
                break;
                
            default:
                showErrorToast(
                    'Extraction Failed',
                    `Failed to extract text from PDF: ${error.message}. Please try pasting the text manually.`
                );
        }
        
        event.target.value = '';
        resetUploadCard();
    }
}

/**
 * Normalize and clean extracted PDF text
 * @param {string} text - Raw text from PDF
 * @returns {string} - Cleaned and normalized text
 */
function normalizePdfText(text) {
    if (!text) return '';
    
    // Step 1: Fix hyphenated words split across lines
    // Match: word- \n word -> word
    text = text.replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2');
    
    // Step 2: Remove soft hyphens and zero-width characters
    text = text.replace(/[\u00AD\u200B\u200C\u200D\uFEFF]/g, '');
    
    // Step 3: Normalize Unicode characters to ASCII equivalents
    text = text.normalize('NFKD');
    
    // Step 4: Replace common Unicode punctuation with ASCII
    const unicodeMap = {
        '\u2018': "'", // Left single quote
        '\u2019': "'", // Right single quote
        '\u201C': '"', // Left double quote
        '\u201D': '"', // Right double quote
        '\u2013': '-', // En dash
        '\u2014': '-', // Em dash
        '\u2026': '...', // Ellipsis
        '\u00A0': ' ', // Non-breaking space
        '\u2022': '*', // Bullet
        '\u2023': '*', // Triangular bullet
        '\u25E6': '*', // White bullet
        '\u2043': '*', // Hyphen bullet
    };
    
    Object.keys(unicodeMap).forEach(unicode => {
        text = text.replace(new RegExp(unicode, 'g'), unicodeMap[unicode]);
    });
    
    // Step 5: Remove or replace problematic non-ASCII characters
    // Keep letters, numbers, common punctuation, and spaces
    text = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    
    // Step 6: Normalize whitespace
    // Replace multiple spaces with single space
    text = text.replace(/[ \t]+/g, ' ');
    
    // Replace multiple newlines with double newline (paragraph break)
    text = text.replace(/\n{3,}/g, '\n\n');
    
    // Remove spaces at start/end of lines
    text = text.split('\n').map(line => line.trim()).join('\n');
    
    // Step 7: Fix common PDF extraction issues
    // Remove page numbers that appear alone on a line
    text = text.replace(/^\d+\s*$/gm, '');
    
    // Remove header/footer patterns (optional - can be customized)
    // Example: Remove lines with only "Page X of Y"
    text = text.replace(/^Page \d+ of \d+\s*$/gmi, '');
    
    // Step 8: Final cleanup
    text = text.trim();
    
    // Replace remaining multiple spaces
    text = text.replace(/  +/g, ' ');
    
    return text;
}

/**
 * Extract and normalize text from PDF file using PDF.js
 * @param {File} file - PDF file object
 * @returns {Promise<string>} - Cleaned and normalized text from all pages
 * @throws {Error} - Specific error types for different failure scenarios
 */
async function extractPdfText(file) {
    // Check if PDF.js is loaded with extended retry
    if (typeof pdfjsLib === 'undefined') {
        console.log('⏳ Waiting for PDF.js to load...');
        
        // Try to wait for PDF.js to load (up to 3 seconds)
        for (let i = 0; i < 6; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (typeof pdfjsLib !== 'undefined') {
                console.log('✅ PDF.js loaded successfully');
                break;
            }
        }
        
        // Final check
        if (typeof pdfjsLib === 'undefined') {
            const error = new Error('PDF.js library not loaded');
            error.code = 'LIBRARY_NOT_LOADED';
            throw error;
        }
    }
    
    // Ensure worker is configured
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        console.log('🔧 PDF.js worker configured');
    }
    
    try {
        // Read file as ArrayBuffer
        let arrayBuffer;
        try {
            arrayBuffer = await file.arrayBuffer();
        } catch (error) {
            const fileError = new Error('Failed to read PDF file');
            fileError.code = 'FILE_READ_ERROR';
            throw fileError;
        }
        
        // Validate ArrayBuffer
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            const error = new Error('PDF file is empty or corrupted');
            error.code = 'EMPTY_FILE';
            throw error;
        }
        
        // Load PDF document with options
        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            verbosity: 0, // Suppress console warnings
            password: '' // Try with empty password first
        });
        
        let pdf;
        try {
            pdf = await loadingTask.promise;
        } catch (error) {
            // Handle specific PDF.js errors
            if (error.name === 'PasswordException') {
                const pwError = new Error('PDF is password-protected');
                pwError.code = 'PASSWORD_PROTECTED';
                throw pwError;
            } else if (error.name === 'InvalidPDFException') {
                const invalidError = new Error('Invalid or corrupted PDF file');
                invalidError.code = 'INVALID_PDF';
                throw invalidError;
            } else if (error.name === 'MissingPDFException') {
                const missingError = new Error('PDF data is missing or incomplete');
                missingError.code = 'MISSING_DATA';
                throw missingError;
            } else if (error.name === 'UnexpectedResponseException') {
                const unexpectedError = new Error('Unexpected PDF format');
                unexpectedError.code = 'UNEXPECTED_FORMAT';
                throw unexpectedError;
            } else {
                // Generic PDF loading error
                const loadError = new Error(`Failed to load PDF: ${error.message}`);
                loadError.code = 'LOAD_ERROR';
                throw loadError;
            }
        }
        
        console.log(`PDF loaded: ${pdf.numPages} pages`);
        
        // Check if PDF has pages
        if (pdf.numPages === 0) {
            const error = new Error('PDF has no pages');
            error.code = 'NO_PAGES';
            throw error;
        }
        
        // Extract text from all pages in parallel for better performance
        const pagePromises = [];
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            pagePromises.push(
                pdf.getPage(pageNum)
                    .then(page => page.getTextContent())
                    .then(textContent => {
                        // Extract text with better spacing
                        let pageText = '';
                        let lastY = null;
                        
                        textContent.items.forEach(item => {
                            // Add line break if Y position changed significantly
                            if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                                pageText += '\n';
                            }
                            
                            // Add space if needed (not at start of line)
                            if (pageText.length > 0 && !pageText.endsWith('\n') && !pageText.endsWith(' ')) {
                                pageText += ' ';
                            }
                            
                            pageText += item.str;
                            lastY = item.transform[5];
                        });
                        
                        return {
                            pageNum,
                            text: pageText.trim()
                        };
                    })
                    .catch(error => {
                        console.warn(`Failed to extract page ${pageNum}:`, error);
                        return {
                            pageNum,
                            text: ''
                        };
                    })
            );
        }
        
        // Wait for all pages to be processed
        const pages = await Promise.all(pagePromises);
        
        // Combine all pages with page breaks
        const rawText = pages
            .sort((a, b) => a.pageNum - b.pageNum)
            .map(page => page.text)
            .filter(text => text.length > 0)
            .join('\n\n');
        
        // Check if any text was extracted
        if (!rawText || rawText.trim().length === 0) {
            const error = new Error('No text found in PDF');
            error.code = 'NO_TEXT';
            throw error;
        }
        
        // Normalize and clean the extracted text
        const cleanedText = normalizePdfText(rawText);
        
        // Final validation
        if (cleanedText.length < 10) {
            const error = new Error('Extracted text is too short');
            error.code = 'INSUFFICIENT_TEXT';
            throw error;
        }
        
        console.log(`Extracted ${rawText.length} characters, cleaned to ${cleanedText.length} characters`);
        
        return cleanedText;
        
    } catch (error) {
        // Re-throw with code if already set
        if (error.code) {
            throw error;
        }
        
        // Generic extraction error
        console.error('PDF extraction error:', error);
        const genericError = new Error(`Failed to extract PDF: ${error.message}`);
        genericError.code = 'EXTRACTION_ERROR';
        throw genericError;
    }
}

/**
 * Legacy function name for backward compatibility
 * @deprecated Use extractPdfText() instead
 */
async function extractTextFromPdf(file) {
    return extractPdfText(file);
}

/**
 * Tokenize text into words
 * @param {string} text - Input text to tokenize
 * @returns {Array<string>} - Array of tokens
 */
function tokenize(text) {
    if (!text || typeof text !== 'string') {
        return [];
    }
    
    // Convert to lowercase and extract words (alphanumeric + hyphens)
    return text
        .toLowerCase()
        .match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) || [];
}

/**
 * Remove stopwords from token array
 * @param {Array<string>} tokens - Array of tokens
 * @returns {Array<string>} - Filtered tokens
 */
function removeStopwords(tokens) {
    return tokens.filter(token => {
        // Keep tokens that are:
        // - Not in stopwords list
        // - Longer than 2 characters
        // - Not purely numeric
        return !STOPWORDS.has(token) && 
               token.length > 2 && 
               !/^\d+$/.test(token);
    });
}

/**
 * Extract keywords from text
 * @param {string} text - Input text
 * @returns {Set<string>} - Set of unique keywords
 */
function extractKeywords(text) {
    const tokens = tokenize(text);
    const filtered = removeStopwords(tokens);
    return new Set(filtered);
}

/**
 * Find matched and missing keywords
 * @param {Set<string>} jobKeywords - Keywords from job description
 * @param {Set<string>} resumeKeywords - Keywords from resume
 * @returns {Object} - Object containing matched and missing keywords
 */
function findMatches(jobKeywords, resumeKeywords) {
    const matched = new Set();
    const missing = new Set();

    // Convert resume keywords to array for substring matching
    const resumeKeywordsArray = Array.from(resumeKeywords);
    const resumeText = resumeKeywordsArray.join(' ');

    jobKeywords.forEach(jobKeyword => {
        // Check for exact match
        if (resumeKeywords.has(jobKeyword)) {
            matched.add(jobKeyword);
        } 
        // Check for substring match (e.g., "javascript" matches "js")
        else if (resumeText.includes(jobKeyword)) {
            matched.add(jobKeyword);
        }
        // Check if job keyword is contained in any resume keyword
        else {
            let found = false;
            for (const resumeKeyword of resumeKeywords) {
                if (resumeKeyword.includes(jobKeyword) || jobKeyword.includes(resumeKeyword)) {
                    matched.add(jobKeyword);
                    found = true;
                    break;
                }
            }
            if (!found) {
                missing.add(jobKeyword);
            }
        }
    });

    return {
        matched: Array.from(matched).sort(),
        missing: Array.from(missing).sort()
    };
}

/**
 * Categorize a keyword based on patterns
 * @param {string} keyword - Keyword to categorize
 * @returns {string} - Category name (skills, technologies, tools, roles, or general)
 */
function categorizeKeyword(keyword) {
    const lowerKeyword = keyword.toLowerCase();
    
    for (const [category, patterns] of Object.entries(KEYWORD_PATTERNS)) {
        for (const pattern of patterns) {
            if (lowerKeyword.includes(pattern) || pattern.includes(lowerKeyword)) {
                return category;
            }
        }
    }
    
    return 'general'; // Default category
}

/**
 * Categorize keywords into weighted categories
 * @param {Array<string>} keywords - Array of keywords
 * @returns {Object} - Object with categorized keywords
 */
function categorizeKeywords(keywords) {
    const categorized = {
        skills: [],
        technologies: [],
        tools: [],
        roles: [],
        general: []
    };
    
    keywords.forEach(keyword => {
        const category = categorizeKeyword(keyword);
        categorized[category].push(keyword);
    });
    
    return categorized;
}

/**
 * Calculate weighted score based on categories
 * @param {Object} matchedCategories - Matched keywords by category
 * @param {Object} totalCategories - Total keywords by category
 * @returns {Object} - Weighted score and category breakdown
 */
function calculateWeightedScore(matchedCategories, totalCategories) {
    const categoryScores = {};
    let weightedTotal = 0;
    
    // Calculate score for each category
    Object.keys(CATEGORY_WEIGHTS).forEach(category => {
        const matched = matchedCategories[category]?.length || 0;
        const total = totalCategories[category]?.length || 0;
        
        const categoryScore = total > 0 ? (matched / total) * 100 : 0;
        const weightedScore = categoryScore * CATEGORY_WEIGHTS[category];
        
        categoryScores[category] = {
            matched,
            total,
            score: Math.round(categoryScore),
            weightedScore: Math.round(weightedScore * 10) / 10
        };
        
        weightedTotal += weightedScore;
    });
    
    // Handle general keywords (distribute weight if present)
    const generalMatched = matchedCategories.general?.length || 0;
    const generalTotal = totalCategories.general?.length || 0;
    
    if (generalTotal > 0) {
        const generalScore = (generalMatched / generalTotal) * 100;
        const generalWeight = 0.05; // 5% weight for general keywords
        categoryScores.general = {
            matched: generalMatched,
            total: generalTotal,
            score: Math.round(generalScore),
            weightedScore: Math.round(generalScore * generalWeight * 10) / 10
        };
        weightedTotal += generalScore * generalWeight;
    }
    
    return {
        overallScore: Math.round(weightedTotal),
        categoryScores
    };
}

/**
 * Calculate match score (legacy - simple version)
 * @param {number} matchedCount - Number of matched keywords
 * @param {number} totalCount - Total number of job keywords
 * @returns {number} - Match percentage
 */
function calculateScore(matchedCount, totalCount) {
    if (totalCount === 0) return 0;
    return Math.round((matchedCount / totalCount) * 100);
}

/**
 * Highlight matched keywords in resume text with fuzzy matching
 * @param {string} resumeText - Original resume text (may be from PDF extraction)
 * @param {Array<string>} matchedKeywords - Array of matched keywords
 * @returns {string} - HTML string with highlighted keywords
 */
function highlightKeywords(resumeText, matchedKeywords) {
    if (!resumeText || matchedKeywords.length === 0) {
        return escapeHtml(resumeText);
    }

    // Normalize text for better PDF handling
    let highlightedText = resumeText;
    
    // Sort keywords by length (longest first) to avoid partial replacements
    const sortedKeywords = matchedKeywords.sort((a, b) => b.length - a.length);
    
    // Create a map to store original case versions with unique placeholders
    const replacements = new Map();
    let placeholderIndex = 0;
    
    sortedKeywords.forEach(keyword => {
        // Escape special regex characters in keyword
        const escapedKeyword = escapeRegex(keyword);
        
        // Create multiple regex patterns for fuzzy matching
        const patterns = [
            // 1. Exact word boundary match (most precise)
            new RegExp(`\\b(${escapedKeyword})\\b`, 'gi'),
            
            // 2. Match with optional hyphens (for hyphenated words)
            new RegExp(`\\b(${escapedKeyword.replace(/-/g, '-?')})\\b`, 'gi'),
            
            // 3. Match across line breaks (for PDF extraction artifacts)
            new RegExp(`\\b(${escapedKeyword.split('').join('\\s*')})\\b`, 'gi'),
            
            // 4. Match with flexible spacing (for multi-word terms)
            new RegExp(`\\b(${escapedKeyword.replace(/\s+/g, '\\s+')})\\b`, 'gi')
        ];
        
        // Try each pattern
        patterns.forEach(regex => {
            highlightedText = highlightedText.replace(regex, (match) => {
                // Skip if already highlighted
                if (match.startsWith('__HIGHLIGHT_')) {
                    return match;
                }
                
                // Create unique placeholder
                const placeholder = `__HIGHLIGHT_${placeholderIndex}__`;
                placeholderIndex++;
                
                // Store original matched text (preserving case)
                replacements.set(placeholder, match);
                
                return placeholder;
            });
        });
        
        // Additional fuzzy match for common variations
        // Handle cases like "JavaScript" vs "javascript" vs "Java Script"
        const fuzzyPattern = keyword
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '') // Remove special chars
            .split('')
            .join('[^a-z0-9]*'); // Allow any non-alphanumeric between chars
        
        const fuzzyRegex = new RegExp(`\\b(${fuzzyPattern})\\b`, 'gi');
        
        highlightedText = highlightedText.replace(fuzzyRegex, (match) => {
            // Only highlight if it's a close match (length within 50%)
            const lengthDiff = Math.abs(match.length - keyword.length);
            const maxDiff = Math.ceil(keyword.length * 0.5);
            
            if (lengthDiff <= maxDiff && !match.startsWith('__HIGHLIGHT_')) {
                const placeholder = `__HIGHLIGHT_${placeholderIndex}__`;
                placeholderIndex++;
                replacements.set(placeholder, match);
                return placeholder;
            }
            
            return match;
        });
    });
    
    // Escape HTML to prevent XSS
    highlightedText = escapeHtml(highlightedText);
    
    // Replace placeholders with highlighted spans
    replacements.forEach((originalText, placeholder) => {
        // Escape the original text for safety
        const escapedOriginal = escapeHtml(originalText);
        
        // Replace placeholder with highlighted version
        highlightedText = highlightedText.replace(
            escapeHtml(placeholder),
            `<mark>${escapedOriginal}</mark>`
        );
    });
    
    // Preserve line breaks for better readability
    highlightedText = highlightedText.replace(/\n/g, '<br>');
    
    return highlightedText;
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Escape special regex characters
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Update the DOM with results
 * @param {Object} results - Analysis results
 */
function updateDOM(results) {
    const { matched, missing, highlightedResume, score, scoreBreakdown } = results;

    // Clear previous results
    DOM.matchedKeywords.innerHTML = '';
    DOM.missingKeywords.innerHTML = '';
    DOM.highlightedResume.innerHTML = '';

    // Update matched keywords
    if (matched.length > 0) {
        matched.forEach(keyword => {
            const li = document.createElement('li');
            li.textContent = keyword;
            li.setAttribute('role', 'listitem');
            DOM.matchedKeywords.appendChild(li);
        });
    } else {
        DOM.matchedKeywords.innerHTML = '<li style="list-style: none; color: var(--text-muted);">No matched keywords found</li>';
    }

    // Update missing keywords
    if (missing.length > 0) {
        missing.forEach(keyword => {
            const li = document.createElement('li');
            li.textContent = keyword;
            li.setAttribute('role', 'listitem');
            DOM.missingKeywords.appendChild(li);
        });
    } else {
        DOM.missingKeywords.innerHTML = '<li style="list-style: none; color: var(--text-muted);">All keywords matched!</li>';
    }

    // Update highlighted resume
    DOM.highlightedResume.innerHTML = highlightedResume;

    // Update heading with score
    DOM.resultsHeading.textContent = `Analysis Results - Weighted Score: ${score}%`;
    DOM.resultsHeading.setAttribute('aria-label', `Analysis results showing ${score} percent weighted match`);

    // Update or create score breakdown panel
    updateScoreBreakdown(scoreBreakdown);

    // Show results section with animation
    DOM.resultsSection.style.display = 'block';
    DOM.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Update score breakdown panel
 * @param {Object} scoreBreakdown - Category scores breakdown
 */
function updateScoreBreakdown(scoreBreakdown) {
    if (!scoreBreakdown) return;
    
    // Find or create breakdown panel
    let breakdownPanel = document.getElementById('score-breakdown-panel');
    
    if (!breakdownPanel) {
        // Create new breakdown panel
        breakdownPanel = document.createElement('div');
        breakdownPanel.id = 'score-breakdown-panel';
        breakdownPanel.className = 'result-panel score-breakdown-panel';
        
        // Insert after results heading
        const resultsGrid = document.querySelector('.results-grid');
        if (resultsGrid) {
            resultsGrid.insertBefore(breakdownPanel, resultsGrid.firstChild);
        }
    }
    
    // Build breakdown HTML
    let breakdownHTML = `
        <h3 class="panel-heading">Score Breakdown</h3>
        <div class="panel-content score-breakdown-content">
    `;
    
    const categoryNames = {
        skills: 'Skills',
        technologies: 'Technologies',
        tools: 'Tools',
        roles: 'Job Roles'
    };
    
    const categoryIcons = {
        skills: '🎯',
        technologies: '⚙️',
        tools: '🔧',
        roles: '👔'
    };
    
    // Add each category
    Object.keys(CATEGORY_WEIGHTS).forEach(category => {
        const data = scoreBreakdown[category];
        if (!data) return;
        
        const weight = CATEGORY_WEIGHTS[category] * 100;
        const percentage = data.total > 0 ? (data.matched / data.total) * 100 : 0;
        
        breakdownHTML += `
            <div class="score-category">
                <div class="category-header">
                    <span class="category-icon">${categoryIcons[category]}</span>
                    <span class="category-name">${categoryNames[category]}</span>
                    <span class="category-weight">(${weight}% weight)</span>
                </div>
                <div class="category-stats">
                    <span class="stat-matched">${data.matched}/${data.total} matched</span>
                    <span class="stat-score">${data.score}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="weighted-contribution">
                    Contributes: <strong>${data.weightedScore}%</strong> to overall score
                </div>
            </div>
        `;
    });
    
    // Add general keywords if present
    if (scoreBreakdown.general && scoreBreakdown.general.total > 0) {
        const data = scoreBreakdown.general;
        const percentage = (data.matched / data.total) * 100;
        
        breakdownHTML += `
            <div class="score-category general-category">
                <div class="category-header">
                    <span class="category-icon">📋</span>
                    <span class="category-name">Other Keywords</span>
                    <span class="category-weight">(5% weight)</span>
                </div>
                <div class="category-stats">
                    <span class="stat-matched">${data.matched}/${data.total} matched</span>
                    <span class="stat-score">${data.score}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }
    
    breakdownHTML += `</div>`;
    
    breakdownPanel.innerHTML = breakdownHTML;
}

/**
 * Validate inputs
 * @returns {boolean} - True if inputs are valid
 */
function validateInputs() {
    const jobDescription = DOM.jobDescription.value.trim();
    const resume = DOM.resume.value.trim();

    if (!jobDescription && !resume) {
        alert('Please enter both a job description and your resume to analyze.');
        DOM.jobDescription.focus();
        return false;
    }

    if (!jobDescription) {
        alert('Please enter a job description to analyze.');
        DOM.jobDescription.focus();
        return false;
    }

    if (!resume) {
        alert('Please enter your resume to analyze.');
        DOM.resume.focus();
        return false;
    }

    return true;
}

/**
 * Main analysis function
 */
function analyzeResume() {
    // Validate inputs
    if (!validateInputs()) {
        return;
    }

    // Show loading state
    DOM.analyzeBtn.textContent = 'Analyzing...';
    DOM.analyzeBtn.disabled = true;

    // Small delay to show loading state
    setTimeout(() => {
        try {
            // Get input values
            const jobDescription = DOM.jobDescription.value.trim();
            const resume = DOM.resume.value.trim();

            // Extract keywords
            const jobKeywords = extractKeywords(jobDescription);
            const resumeKeywords = extractKeywords(resume);

            // Find matches
            const { matched, missing } = findMatches(jobKeywords, resumeKeywords);

            // Categorize keywords
            const jobCategorized = categorizeKeywords(Array.from(jobKeywords));
            const matchedCategorized = categorizeKeywords(matched);
            
            // Calculate weighted score
            const { overallScore, categoryScores } = calculateWeightedScore(
                matchedCategorized,
                jobCategorized
            );

            // Highlight keywords in resume
            const highlightedResume = highlightKeywords(resume, matched);

            // Update DOM
            updateDOM({
                matched,
                missing,
                highlightedResume,
                score: overallScore,
                scoreBreakdown: categoryScores
            });

            // Log results for debugging
            console.log('Analysis Results:', {
                totalJobKeywords: jobKeywords.size,
                matchedCount: matched.length,
                missingCount: missing.length,
                simpleScore: calculateScore(matched.length, jobKeywords.size) + '%',
                weightedScore: overallScore + '%',
                categoryBreakdown: categoryScores
            });

        } catch (error) {
            console.error('Error during analysis:', error);
            alert('An error occurred during analysis. Please try again.');
        } finally {
            // Reset button state
            DOM.analyzeBtn.textContent = 'Analyze';
            DOM.analyzeBtn.disabled = false;
        }
    }, 300);
}

/**
 * Clear all inputs and results
 */
function clearAll() {
    // Confirm if there's content
    const hasContent = DOM.jobDescription.value.trim() || DOM.resume.value.trim();
    
    if (hasContent) {
        const confirmed = confirm('Are you sure you want to clear all content?');
        if (!confirmed) {
            return;
        }
    }

    // Clear inputs
    DOM.jobDescription.value = '';
    DOM.resume.value = '';
    DOM.resumePdfInput.value = '';
    
    // Reset upload card
    resetUploadCard();

    // Clear results
    DOM.matchedKeywords.innerHTML = '';
    DOM.missingKeywords.innerHTML = '';
    DOM.highlightedResume.innerHTML = '';

    // Hide results section
    DOM.resultsSection.style.display = 'none';

    // Reset heading
    DOM.resultsHeading.textContent = 'Analysis Results';

    // Focus on first input
    DOM.jobDescription.focus();

    console.log('All content cleared');
}

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        tokenize,
        removeStopwords,
        extractKeywords,
        findMatches,
        calculateScore,
        highlightKeywords
    };
}
