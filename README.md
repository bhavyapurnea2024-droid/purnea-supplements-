# Purnea Supps - Vercel Deployment Guide

This project is optimized for deployment on [Vercel](https://vercel.com).

## Deployment Steps

1. **Export the Project**: Use the AI Studio settings menu to export your project to a GitHub repository or download it as a ZIP file.
2. **Import to Vercel**:
   - Log in to your Vercel account.
   - Click **Add New** > **Project**.
   - Import your GitHub repository or upload the project files.
3. **Configure Environment Variables**:
   In the Vercel project settings, add the following environment variables (you can find these values in your `firebase-applet-config.json`):
   - `GEMINI_API_KEY`: Your Gemini API key.
   - `VITE_FIREBASE_API_KEY`: Your Firebase API key.
   - `VITE_FIREBASE_AUTH_DOMAIN`: Your Firebase Auth domain.
   - `VITE_FIREBASE_PROJECT_ID`: Your Firebase project ID.
   - `VITE_FIREBASE_STORAGE_BUCKET`: Your Firebase storage bucket.
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`: Your Firebase messaging sender ID.
   - `VITE_FIREBASE_APP_ID`: Your Firebase app ID.
   - `VITE_FIREBASE_FIRESTORE_DATABASE_ID`: Your Firestore database ID.
4. **Deploy**: Click **Deploy**. Vercel will automatically detect the Vite configuration and build your application.

## Why `vercel.json`?

The included `vercel.json` file contains a rewrite rule that ensures all requests are routed to `index.html`. This is essential for Single Page Applications (SPAs) using client-side routing (like React Router) to work correctly when users refresh the page or visit deep links.

## Firebase Configuration

The application is configured to use environment variables for Firebase in production. If these variables are not set in Vercel, it will fall back to the values in `firebase-applet-config.json`. For better security, it is recommended to set them as environment variables in the Vercel dashboard.
