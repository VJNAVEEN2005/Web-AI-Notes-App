# 📄 AI PDF Notes Assistant

A powerful full-stack web application that combines OCR (Optical Character Recognition) with AI-powered question answering. Upload PDF documents, extract text, and ask questions using Google's Gemini AI with Retrieval-Augmented Generation (RAG).

## ✨ Features

- **📤 PDF Upload & Processing**: Upload PDF files with real-time processing progress
- **🔍 OCR Text Extraction**: Extract text from PDFs using EasyOCR
- **📖 Interactive PDF Viewer**: Navigate through PDF pages with extracted text display
- **🤖 AI Q&A with RAG**: Ask questions about your PDF using Gemini AI
- **🔗 Smart Page References**: Click on page numbers in AI responses to jump to that page
- **💾 Local Storage**: PDF data and extracted text stored in frontend
- **🎨 Modern UI**: Beautiful Tailwind CSS interface with responsive design

## 🛠️ Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- react-pdf (PDF viewing)
- @google/generative-ai (Gemini AI)
- axios

### Backend (Required separately)
- FastAPI
- EasyOCR
- pdf2image
- Python 3.8+

## 📋 Prerequisites

- Node.js 16+ and npm
- Python 3.8+ (for backend)
- Poppler (for pdf2image)
- Google Gemini API key ([Get it here](https://makersuite.google.com/app/apikey))

## 🚀 Installation

### Frontend Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Start the development server**:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Backend Setup

You need to set up the FastAPI backend separately with the Python files you provided.

Install Python dependencies:
```bash
pip install fastapi uvicorn easyocr pdf2image pillow python-multipart
```

Run the backend:
```bash
uvicorn main:app --reload
```

## 🔧 Configuration

### Gemini API Key

1. Get your free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click the **⚙️ API Settings** button in the app header
3. Enter your API key and click Save

## 📖 Usage

1. **Upload a PDF** - Select and upload your document
2. **Wait for Processing** - OCR extraction with progress tracking
3. **View PDF** - Navigate pages and see extracted text
4. **Ask Questions** - Use AI to query document content
5. **Click Page References** - Jump to specific pages from AI responses

## 📁 Project Structure

```
src/
├── components/
│   ├── PDFUploader.jsx     # File upload component
│   ├── PDFViewer.jsx       # PDF display component
│   └── ChatInterface.jsx   # AI chat component
├── App.jsx                 # Main app with Tailwind
├── index.css               # Tailwind directives
└── main.jsx                # React entry point
```

## 🐛 Troubleshooting

- **Backend URL**: Update `API_BASE_URL` in `src/App.jsx` if needed
- **CORS Issues**: Ensure FastAPI has proper CORS middleware
- **PDF Loading**: Check browser console for errors

---

Built with React, Tailwind CSS, FastAPI, and Gemini AI
