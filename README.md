# Cash Pulse

Cash Pulse is an AI-powered financial platform that analyzes SME loan requests and automates disbursement workflows.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18 or higher) for the frontend
- [Python](https://www.python.org/) (3.11 or higher) for the backend
- [MongoDB](https://www.mongodb.com/try/download/community) (Local instance or Docker container)
- [Git](https://git-scm.com/)

---

## 🚀 Getting Started

Follow these steps to run the application locally without any errors.

### 1. Database Setup (MongoDB)

You need a running MongoDB instance. By default, the backend expects MongoDB to run on `localhost:27017`.

**Option A: Local Installation**
- Install [MongoDB Community Server](https://www.mongodb.com/try/download/community) and start the service.

**Option B: Docker**
If you have Docker installed, you can spin up a MongoDB container quickly:
```bash
docker run -d -p 27017:27017 --name cashpulse-mongo mongo:7
```

### 2. Backend Setup (FastAPI)

The backend is built with Python and FastAPI.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment (recommended):
   ```bash
   python -m venv venv
   
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up Environment Variables:
   Create a `.env` file in the `backend` directory. You can use the provided `.env.example` as a template, or manually add:
   ```env
   MONGODB_URL=mongodb://localhost:27017
   DATABASE_NAME=cashpulse
   JWT_SECRET_KEY=your_super_secret_key_here
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```
5. Seed the Database (Optional but recommended for testing):
   ```bash
   python scripts/seed_data.py
   ```
6. Start the Backend Server:
   ```bash
   uvicorn main:app --reload
   ```
   The backend API will be available at [http://localhost:8000](http://localhost:8000). You can view the API documentation at [http://localhost:8000/docs](http://localhost:8000/docs).

### 3. Frontend Setup (Next.js)

The frontend is built with Next.js and React.

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the required Node.js dependencies:
   ```bash
   npm install
   ```
3. Set up Environment Variables:
   Create a `.env.local` file in the `frontend` directory and add the backend API URL:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. Start the Frontend Development Server:
   ```bash
   npm run dev
   ```
   The frontend application will be available at [http://localhost:3000](http://localhost:3000).

---

## Troubleshooting

- **Backend cannot connect to MongoDB**: Ensure your MongoDB server/Docker container is running and accessible at `localhost:27017`.
- **CORS Errors**: Ensure the frontend is running on `http://localhost:3000` and that this origin is allowed in the backend CORS settings.
- **Port Conflicts**: If ports 3000 or 8000 are already in use, you can change them by providing different flags (`--port` for uvicorn, or `PORT=3001 npm run dev` for Next.js).
