# Deployment Guide

This document explains how to deploy the Resume Builder application to a free hosting service.

## Option 1: Deploy to Render (Recommended)

### Prerequisites
1. An account on [Render](https://render.com/)
2. An account on [GitHub](https://github.com/)
3. An OpenAI API key

### Steps

1. **Create a GitHub repository:**
   - Go to [GitHub](https://github.com/) and create a new repository
   - Name it "resume-builder"
   - Don't initialize it with a README, .gitignore, or license

2. **Push your code to GitHub:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/resume-builder.git
   git branch -M main
   git push -u origin main
   ```

3. **Deploy to Render:**
   - Go to [Render](https://render.com/) and sign up/sign in
   - Click "New +" and select "Web Service"
   - Connect your GitHub account when prompted
   - Select your resume-builder repository
   - Configure the settings:
     - Name: resume-builder
     - Environment: Node
     - Build command: `npm install`
     - Start command: `node server.js`
   - Add environment variables:
     - `OPENAI_API_KEY` with your OpenAI API key
   - Click "Create Web Service"

4. **Wait for deployment:**
   - Render will automatically build and deploy your application
   - The deployment process may take a few minutes
   - Once complete, you'll receive a URL for your application

## Option 2: Deploy to Railway

1. Sign up at [Railway](https://railway.app/)
2. Create a new project
3. Connect your GitHub repository or deploy directly from the Railway dashboard
4. Add the required environment variables:
   - `OPENAI_API_KEY` with your OpenAI API key

## Option 3: Deploy to Vercel

1. Sign up at [Vercel](https://vercel.com/)
2. Create a new project
3. Import your Git repository
4. Configure the build settings:
   - Build Command: `npm install`
   - Output Directory: `public`
5. Add environment variables in the project settings

## Environment Variables

The application requires the following environment variables:

- `OPENAI_API_KEY`: Your OpenAI API key for resume parsing functionality
- `PORT`: Port for the application (automatically set by hosting platforms)

## Notes

- The free tier of most hosting platforms has limitations on usage
- Make sure to monitor your usage to avoid unexpected charges
- Some platforms may put your application to sleep after periods of inactivity