# Resume Builder

A web application for creating professional resumes in PDF and DOCX formats.

## Features
- Parse existing resumes using AI (PDF, DOCX, TXT)
- Generate modern resumes in PDF and DOCX formats
- Photo upload with cropping functionality
- Responsive design that works on all devices
- Multi-language support (Russian, Uzbek)

## Technologies Used
- Node.js with Express
- Puppeteer for PDF generation
- DOCX templating library
- OpenAI API for resume parsing
- Vanilla JavaScript frontend
- Croppie.js for image cropping

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```
4. Start the server:
   ```
   npm start
   ```
5. Visit `http://localhost:3000` in your browser

## Deployment

This application can be deployed to Render using the provided `render.yaml` configuration file.

### Environment Variables
- `OPENAI_API_KEY` - Your OpenAI API key
- `PORT` - Port for the application (set automatically by Render)