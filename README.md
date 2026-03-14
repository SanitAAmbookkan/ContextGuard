ContextGuard – AI Powered Focus Guardian 

ContextGuard is an AI‑powered browser extension designed to help users stay focused while working online by intelligently detecting and managing digital distractions.

Unlike traditional website blockers that rely on static blacklists, ContextGuard understands the context of what the user is working on and dynamically detects distracting content in real time.
Problem Statement

Maintaining focus while working online has become increasingly difficult due to constant digital distractions such as:

    Social media platforms

    Entertainment websites

    Irrelevant browsing

Most existing productivity tools rely on static blacklists, which means:

    Useful resources may get blocked

    New distracting websites may go undetected

    Users can bypass restrictions by switching to other devices like smartphones

There is a need for a smart system that understands the user’s task and detects distractions dynamically across devices.
Solution – ContextGuard

ContextGuard acts as a digital focus assistant that understands the user's task and monitors browsing activity in real time.

When a user starts a focus session:

    The user enters the task they are working on.

    The extension monitors active browser tabs.

    AI compares the task with the webpage content.

    If the page is irrelevant:

        A warning popup appears.

    If the user repeatedly visits distracting pages:

        The site gets temporarily blocked.

ContextGuard also includes focus timers, productivity analytics, and cross‑device synchronization.
Key Features
AI Distraction Detection

Uses semantic similarity to determine whether a webpage is related to the user's task.
Smart Warning Assistant

Alerts the user when they open distracting websites.
Adaptive Website Blocking

Repeated distractions trigger automatic blocking during the focus session.
Focus Timer

Structured focus–break cycles encourage healthy productivity habits.
Phone Sync

Users can scan a QR code to sync their phone with the focus session, preventing distraction switching across devices.
Productivity Dashboard

Provides insights such as:

    Focus score

    Number of distractions

    Focus timeline

    Productivity analytics

How It Works

User enters task
        ↓
Focus session starts
        ↓
Extension monitors browser tabs
        ↓
AI compares task with webpage title/content
        ↓
Relevant → Allow page
Irrelevant → Warning popup
        ↓
Repeated distractions → Block site
        ↓
Session analytics shown in dashboard

Tech Stack

Frontend

    HTML

    CSS

    JavaScript

    React (for dashboard UI)

AI Processing

    Sentence Embeddings / Semantic Similarity

    HuggingFace / LLM APIs

Browser Extension

    Chrome Extension (Manifest V3)

    Chrome Tabs API

Backend (optional)

    FastAPI / Node.js

Visualization

    Chart.js

Design

    Figma / FigmaMake

System Architecture

Browser Extension
        ↓
Detect active tab
        ↓
AI Relevance Detection
        ↓
Warning System
        ↓
Blocking Mechanism
        ↓
Dashboard Analytics
        ↓
Phone Sync via QR

Installation

Clone the repository:

git clone https://github.com/yourusername/contextguard.git

Open Chrome and go to:

chrome://extensions

Enable Developer Mode

Click Load Unpacked and select the project folder.

The extension will now be available in your browser.
Demo Workflow

    Start a focus session.

    Enter the task you are working on.

    Open a distracting website.

    ContextGuard warns the user.

    If distractions continue, the site gets blocked.

    Dashboard displays productivity insights.

Future Improvements

    Personalized AI distraction detection

    Mobile app integration

    Machine learning–based focus predictions

    Team productivity analytics

    Smart break recommendations

Contributors

    Gloria Steephan

    Maria Mejo

    Jilsa Mariya

    Sanit A Ambookkan

License

This project is created for educational and hackathon purposes.
