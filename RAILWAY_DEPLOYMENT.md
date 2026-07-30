# Railway Deployment Guide

## Backend Deployment on Railway

### Prerequisites
- Railway account
- GitHub repository connected to Railway

### Steps

1. **Push backend branch to GitHub**
   ```bash
   git checkout backend
   git push -u origin backend
   ```

2. **Create New Project on Railway**
   - Go to railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Select the `backend` branch

3. **Configure Environment Variables**
   Railway will automatically detect the Python project. Add these variables:
   
   ```
   MONGODB_URL = (Railway will provide this when you add MongoDB plugin)
   DATABASE_NAME = cashpulse
   JWT_SECRET_KEY = (generate a secure random string)
   JWT_ALGORITHM = HS256
   JWT_EXPIRE_MINUTES = 480
   APP_ENV = production
   CORS_ORIGINS = ["https://your-frontend-domain.vercel.app"]
   ```

4. **Add MongoDB Plugin**
   - In your Railway project, click "New Service"
   - Select "MongoDB"
   - Railway will provide the MONGODB_URL automatically

5. **Deploy**
   - Railway will automatically deploy when you push to the backend branch
   - Monitor the deployment logs

6. **Get Your Backend URL**
   - Once deployed, Railway will provide a URL like: `https://your-app.railway.app`
   - Update your frontend's NEXT_PUBLIC_API_URL with this URL

## Frontend Deployment on Vercel

### Steps

1. **Push main branch to GitHub**
   ```bash
   git checkout main
   git push origin main
   ```

2. **Deploy on Vercel**
   - Go to vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Select the `main` branch
   - Add environment variable:
     ```
     NEXT_PUBLIC_API_URL = https://your-backend-domain.railway.app
     ```
   - Click "Deploy"

3. **Update CORS**
   - Update backend CORS_ORIGINS to include your Vercel domain
   - Push changes to backend branch
   - Railway will auto-redeploy

## Notes

- Railway uses the `Procfile` and `nixpacks.toml` for build configuration
- Vercel uses `vercel.json` for build configuration
- Both platforms auto-deploy on git push
- MongoDB on Railway is free for small projects
