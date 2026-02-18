
# Deploying the Attendify Backend

Follow these steps to get your backend live on Render.

## 1. Create a GitHub Repository
1. Go to [GitHub](https://github.com) and create a new repository named `attendify-backend`.
2. Upload the `server.js` and `package.json` files from this project into that repository.

## 2. Deploy to Render
1. Sign in to [Render](https://render.com).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub account and select the `attendify-backend` repository.
4. **Settings**:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **Create Web Service**.

## 3. Connect the Frontend
Once deployed, Render will give you a URL (e.g., `https://attendify-backend-xyz.onrender.com`).
1. Open `services/db.ts` in your frontend code.
2. Update the `API_BASE_URL` constant to match your new Render URL.

**Note:** The current backend uses in-memory storage. On Render's free tier, the data will reset whenever the server goes to sleep or restarts. For permanent storage, you should connect a database like MongoDB.
