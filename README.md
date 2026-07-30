# Cash Pulse

Cash Pulse is a comprehensive platform featuring a Next.js frontend and a FastAPI backend with MongoDB. 

This guide will help collaborators easily set up and run the frontend, backend, and database on their local devices without any errors.

## Prerequisites

Before starting, ensure you have the following installed on your local machine:
- **Node.js** (v18 or higher recommended) & npm/yarn
- **Python** (v3.9 or higher recommended)
- **MongoDB** (running locally or a MongoDB Atlas URI)
- **Git**

---

## 1. Database Setup (MongoDB)

The backend uses MongoDB as its primary database.

**Option A: Local MongoDB**
1. Download and install [MongoDB Community Server](https://www.mongodb.com/try/download/community).
2. Start the MongoDB service. On most systems, it will run on `mongodb://localhost:27017/`.

**Option B: MongoDB Atlas (Cloud)**
1. Create a cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Obtain your connection string.

---

## 2. Backend Setup

The backend is built with FastAPI. Follow these steps to get it running:

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Set up a Python Virtual Environment:**
   Create a virtual environment to manage dependencies locally.
   ```bash
   # On Windows
   python -m venv venv
   venv\Scripts\activate

   # On macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Dependencies:**
   Ensure you install all required packages. *(Note: If `requirements.txt` is missing, ensure you pip install `fastapi`, `uvicorn`, `pymongo`, `python-dotenv`, etc., based on the project's imports).*
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables:**
   Check the `.env` file in the `backend` directory. Ensure it has the correct MongoDB connection string and any necessary secrets.
   ```env
   MONGO_URI=mongodb://localhost:27017/cashpulse
   # Add other required environment variables here
   ```

5. **Run the Backend Server:**
   Start the FastAPI development server.
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend API should now be running at `http://localhost:8000`. You can access the auto-generated documentation at `http://localhost:8000/docs`.

---

## 3. Frontend Setup

The frontend is built using Next.js.

1. **Navigate to the frontend directory:**
   Open a new terminal window/tab and navigate to the frontend:
   ```bash
   cd frontend
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Variables:**
   If there is a `.env.local` or `.env` file required for the frontend (e.g., pointing to the backend API), configure it:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. **Run the Frontend Development Server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```
   The frontend should now be running at `http://localhost:3000`.

---

## Troubleshooting

- **CORS Errors:** If the frontend cannot communicate with the backend due to CORS, ensure the FastAPI backend has `CORSMiddleware` configured to allow origins like `http://localhost:3000`.
- **Database Connection Issues:** Ensure MongoDB is actively running on the port specified in your `.env` file. 
- **Port Conflicts:** If ports `3000` or `8000` are already in use, you can run Next.js on a different port using `npm run dev -- -p 3001` or Uvicorn with `uvicorn app.main:app --reload --port 8001`.

Happy coding!
