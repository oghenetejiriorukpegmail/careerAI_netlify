# Product Requirements Document: AI-Assisted Job Application App

**Version:** 1.0
**Date:** May 16, 2025
**Author:** AI Assistant (Gemini)
**Project Owner:** [User's Name/Company]

## 1. Introduction

### 1.1 Purpose
This document outlines the product requirements for an AI-Assisted Job Application App. The app aims to streamline and enhance the job application process for users by leveraging artificial intelligence to create tailored application materials, match users with relevant job opportunities, and provide insights for profile optimization.

### 1.2 Product Overview
The AI-Assisted Job Application App will be a web-based platform where users can upload their existing resume and optionally link their LinkedIn profile. The application will use AI to extract relevant information, analyze job descriptions, and generate customized, ATS-optimized resumes and cover letters. It will also feature a job matching component using Bright Data MCP to crawl major job boards and a dashboard to track applications and manage generated documents.

### 1.3 Goals
* To significantly reduce the time and effort users spend on customizing resumes and cover letters for each job application.
* To increase the chances of users' applications passing through Applicant Tracking Systems (ATS).
* To improve the quality and relevance of job applications, making users more attractive to hiring managers.
* To provide users with relevant job matches based on their profile.
* To offer actionable advice for LinkedIn profile optimization.
* To provide a centralized dashboard for managing job applications.

### 1.4 Target Audience
Job seekers across various industries and experience levels who are looking to:
* Optimize their job application materials.
* Improve their efficiency in the job application process.
* Increase their visibility to potential employers.
* Find relevant job opportunities more easily.

## 2. Product Features

### 2.1 User Account and Profile Management
* **2.1.1 User Registration & Login:** Secure user authentication (e.g., email/password, OAuth with Google/LinkedIn).
* **2.1.2 Profile Creation:**
    * **2.1.2.1 Resume Upload:** Users can upload their current resume (supported formats: PDF, DOCX).
    * **2.1.2.2 LinkedIn Profile Import:** Users can optionally provide their LinkedIn profile URL for data extraction.
* **2.1.3 Data Storage:** User data (parsed resume, LinkedIn info, generated documents) will be securely stored in the Supabase database.

### 2.2 Information Extraction and AI Analysis
* **2.2.1 Resume Parsing:** AI engine extracts structured information from the uploaded resume (contact details, work experience, education, skills, projects, summary).
* **2.2.2 LinkedIn Profile Scraping & Parsing:** (If URL provided) AI engine, using Bright Data MCP, scrapes and extracts structured information from the user's public LinkedIn profile.
* **2.2.3 Job Description Analysis:**
    * Users can paste job description text or provide a URL.
    * AI engine, using Bright Data MCP for URLs, parses the job description to identify key requirements, skills, company details, and ATS keywords.
* **2.2.4 Potential Job Title Identification:** AI analyzes the user's resume/LinkedIn data to suggest relevant potential job titles. These titles will be displayed on the dashboard and used in the job search process.

### 2.3 AI-Powered Document Generation
* **2.3.1 ATS-Optimized Resume Generation:**
    * AI generates a customized resume tailored to a specific job description.
    * Content is optimized with keywords and phrases from the job description.
    * Ensures ATS-friendly formatting and a modern, professional design.
* **2.3.2 Customized Cover Letter Generation:**
    * AI generates a personalized cover letter aligned with the user's profile and the specific job description.
    * Highlights key strengths and motivations.
    * Maintains a professional tone and ATS-friendly structure.
* **2.3.3 Document Naming and Format:**
    * Generated resumes and cover letters will be in PDF format.
    * Files will be named: `[CompanyName]_[UserName]_Resume.pdf` and `[CompanyName]_[UserName]_CoverLetter.pdf`.
* **2.3.4 Document Download:** Users can download the generated PDF documents.

### 2.4 Job Matching and Curation
* **2.4.1 Job Board Crawling:** Utilizes Bright Data MCP to crawl specified job boards: Indeed, LinkedIn, and Dice.
* **2.4.2 AI-Powered Matching:** AI matches job postings to the user's profile (extracted information, potential job titles) and any user-defined preferences (e.g., location, keywords).
* **2.4.3 Curated Job List:** Presents a list of relevant job matches to the user on their dashboard. Each match includes job title, company, location, and a direct link to the original job posting.

### 2.5 LinkedIn Profile Optimization
* **2.5.1 AI-Driven Analysis:** AI analyzes the user's (imported) LinkedIn profile.
* **2.5.2 Actionable Suggestions:** Provides specific, actionable recommendations to improve the user's LinkedIn profile's attractiveness to hiring managers and its alignment with target job roles.

### 2.6 Dashboard and Application Tracking
* **2.6.1 Centralized Dashboard:** A user-specific dashboard displaying:
    * Curated job matches.
    * Potential job titles identified from the user's resume.
    * An overview of ongoing applications.
* **2.6.2 Application Lifecycle Tracking:**
    * For each job match the user decides to pursue, they can create an "application card."
    * Users can manually update the status of each application (e.g., "To Apply," "Applied," "Interview Scheduled," "Offer Received," "Rejected").
* **2.6.3 Document Access:** Generated resumes and cover letters for a specific job application will be linked to the respective application card for easy access and download.

## 3. Technical Requirements

### 3.1 Platform
* Web-based application, responsive design for desktop and mobile browsers.

### 3.2 Backend & Database
* **Database:** Supabase
    * `DATABASE_URL=postgresql://postgres.edfcwbtzcnfosiiymbqg:IderaOluwa_01@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
    * `SUPABASE_SERVICE_ROLE_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZmN3YnR6Y25mb3NpaXltYnFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYwODcyNCwiZXhwIjoyMDYwMTg0NzI0fQ._6i79BguJV2XXnFmDjyJbQhyjyjiDCjhu1KUXJzyJO4`
    * `SUPABASE_URL=https://edfcwbtzcnfosiiymbqg.supabase.co`
    * `SUPABASE_ANON_KEY=eeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZmN3YnR6Y25mb3NpaXltYnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MDg3MjQsImV4cCI6MjA2MDE4NDcyNH0.HqpZ3zPl27RSTPTVthZN6Iu5gleg_goIl81FzUd5b7U`
* **Backend Logic:** Serverless functions (e.g., Supabase Functions, Netlify Functions) or a lightweight backend framework compatible with chosen deployment.

### 3.3 AI and Machine Learning
* **Primary LLM:** `qwen/qwen3-30b-a3b:free` via OpenRouter.
    * API Key: `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`
* **Secondary/Alternative LLM:** Gemini 2.5 Pro Exp.
    * API Key: `AIzaSyA1UcUNKz2v9mBzKfLay3A3TydQZiziMZ8`
* **NLP Libraries:** Appropriate libraries for text processing, keyword extraction, etc.

### 3.4 Web Scraping
* **Tool:** Bright Data Mobile Carrier Proxies (MCP) or other Bright Data scraping solutions as appropriate for accessing LinkedIn, Indeed, and Dice.
* **Compliance:** Adherence to ethical scraping practices and terms of service of the target websites.

### 3.5 Deployment
* Netlify (free plan) or Replit.
* Considerations for serverless function limitations (execution time, memory).

### 3.6 Code Structure
* No single code file should exceed 500 lines to maintain modularity and readability.

### 3.7 Security
* Secure handling of user credentials and personal data.
* Protection against common web vulnerabilities (XSS, CSRF, SQLi).
* Secure API key management.

## 4. Design and User Experience (UX)

### 4.1 User Interface (UI)
* Clean, modern, and intuitive design.
* Easy navigation and clear calls to action.
* Consistent visual language throughout the application.

### 4.2 User Experience (UX)
* Streamlined onboarding process.
* Clear feedback to the user during AI processing (e.g., loading indicators).
* Simple process for uploading documents and providing job description URLs.
* Easy management and download of generated resumes and cover letters.
* Responsive design for usability across devices.

## 5. Success Metrics

* **User Engagement:**
    * Daily/Monthly Active Users (DAU/MAU).
    * Average session duration.
    * Number of resumes/cover letters generated per user.
* **Task Completion Rate:**
    * Percentage of users successfully generating a resume.
    * Percentage of users successfully generating a cover letter.
    * Number of job applications tracked.
* **User Satisfaction:**
    * User feedback surveys/ratings.
    * Net Promoter Score (NPS).
* **Technical Performance:**
    * Average time to generate a resume/cover letter.
    * Application uptime and error rates.

## 6. Future Considerations (Post MVP)

* Integration with more job boards.
* Advanced analytics on job market trends based on user data (anonymized and aggregated).
* Interview preparation assistance (e.g., common interview questions based on job role).
* Direct application submission through the app (if APIs are available and feasible).
* Premium features (e.g., more advanced resume designs, higher usage limits).
* Community features for users to share tips and experiences.
* Mobile application (iOS/Android).

## 7. Assumptions and Dependencies

* Availability and reliability of OpenRouter and Gemini APIs.
* Effectiveness and reliability of Bright Data MCP for web scraping.
* Supabase provides adequate performance and scalability for the free/chosen tier.
* Netlify/Replit free tier limitations are manageable for the initial version.
* Users will have access to their resumes in supported digital formats.
* Users are willing to provide their LinkedIn profile URLs for enhanced features.
