# Changelog

## [0.2.4] - 2025-05-19

### Fixed
- Increased OpenRouter API timeout from 90 seconds to 180 seconds to prevent timeouts with large documents
- Improved JSON response parsing and normalization for more reliable extraction
- Enhanced error handling with better error messages and fallback options

### Security
- Removed hardcoded API keys and credentials from configuration files
- Updated code to use environment variables for all sensitive credentials
- Added .env.example file with placeholders for required environment variables
- Added SECURITY.md with guidelines for secure credential management
- Updated .gitignore to ensure sensitive files won't be committed
- Removed API keys from test scripts

## [0.2.3] - 2025-05-18

### Added
- Added comprehensive logging system for debugging and analysis
- Implemented organized, timestamped file logging for all steps in resume parsing
- Created a centralized logging utility to standardize log formats and directory structure
- Added logging for Document AI responses, AI provider responses, and structured data
- Added error logging with full stack traces for better debugging

## [0.2.2] - 2025-05-18

### Fixed
- Added robust extraction-based recovery for severely malformed JSON responses
- Implemented intelligent fallback system that extracts key data from unusable JSON
- Enhanced JSON repair to handle large, complex responses from Google Document AI
- Added special handling for JSONP-style wrapped responses
- Fixed summary text extraction in minimized JSON responses

## [0.2.1] - 2025-05-18

### Fixed
- Enhanced JSON response handling to fix malformed JSON from Gemini/Requesty
- Improved code block cleanup in AI responses for more reliable parsing
- Added regex-based JSON repair for broken responses with unterminated strings
- Fixed case-insensitive section detection for certifications, training, and references
- Added automatic bracket/quote balancing for incomplete JSON responses

## [0.2.0] - 2025-05-18

### Changed
- Updated AI model to use Google Gemini 2.5 Flash via Requesty Router
- Made Google Document AI the primary and only PDF parsing method, removing fallback dependencies
- Enhanced resume parsing to extract and display certifications, training, and references
- Improved UI components to show additional resume sections when available

### Removed
- Removed pdf-parse dependency as Google Document AI provides better results
- Removed complex fallback logic in PDF parser that's no longer needed
- Removed PDF.js text extraction since Document AI provides superior structure

### Added
- Added dedicated extraction functions for certifications, training, and references
- Added UI components to display these additional resume sections
- Added comprehensive error handling for Document AI processing

### Fixed
- Fixed issue with missing resume sections in the resume details view
- Fixed Document AI integration to handle authentication more reliably

## [0.1.0] - 2025-05-01

### Added
- Initial implementation of resume parsing with PDF.js and pdf-parse
- Basic PDF text extraction with multiple fallbacks
- Initial resume UI with core sections (contact info, experience, education, skills)
- Supabase integration for user authentication and data storage