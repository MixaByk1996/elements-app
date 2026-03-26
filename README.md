# Elements App

A fullstack application with a React frontend and an Express.js backend that manages a dual-panel element selection list (1,000,000 elements).

## Project Structure

```
elements-app/
├── backend/       Express.js API server
└── frontend/      React application (Create React App)
```

## Running with Docker

```bash
cd elements-app
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

---

## Deploying to Vercel

The app has two parts. Vercel natively hosts the **frontend** (React static build) and can run **serverless functions** for the backend. Follow the steps below.

### Prerequisites

- A [Vercel account](https://vercel.com/signup)
- [Vercel CLI](https://vercel.com/docs/cli) installed: `npm i -g vercel`
- Git repository pushed to GitHub/GitLab/Bitbucket

---

### Step 1 — Deploy the Backend

The Express.js backend needs to be converted to a Vercel serverless function or deployed as a separate service.

#### Option A: Deploy backend as a separate Vercel project

1. Go to your Vercel dashboard and click **Add New → Project**.
2. Import your repository and set the **Root Directory** to `elements-app/backend`.
3. Set the **Framework Preset** to **Other**.
4. Add the following environment variable in the Vercel project settings:
   - `PORT` = `3001` (Vercel ignores this; it manages ports internally)
5. Add a `vercel.json` file inside `elements-app/backend/`:

   ```json
   {
     "version": 2,
     "builds": [{ "src": "server.js", "use": "@vercel/node" }],
     "routes": [{ "src": "/(.*)", "dest": "server.js" }]
   }
   ```

6. Click **Deploy**. After deployment, copy the backend URL (e.g., `https://elements-backend.vercel.app`).

---

### Step 2 — Deploy the Frontend

1. Go to your Vercel dashboard and click **Add New → Project**.
2. Import the same repository and set the **Root Directory** to `elements-app/frontend`.
3. Set the **Framework Preset** to **Create React App**.
4. Under **Environment Variables**, add:
   - `REACT_APP_API_URL` = `https://elements-backend.vercel.app` (the backend URL from Step 1, **no trailing slash**)
5. Click **Deploy**.

After deployment the frontend will be available at your Vercel project URL (e.g., `https://elements-frontend.vercel.app`).

---

### Step 3 — Verify CORS on the backend

The backend already enables CORS for all origins via `app.use(cors())`. If you want to restrict it to your frontend domain, update `server.js`:

```js
app.use(cors({ origin: 'https://elements-frontend.vercel.app' }));
```

---

### Step 4 — Deploying updates

Any push to the main branch of your repository will automatically trigger a new deployment on Vercel (if you connected via GitHub/GitLab/Bitbucket).

To deploy manually from the CLI:

```bash
# From elements-app/backend
cd backend && vercel --prod

# From elements-app/frontend
cd frontend && vercel --prod
```

---

### Notes

- **State is in-memory**: The backend stores state in memory. Each Vercel serverless function invocation is stateless and may lose data between requests. For persistent state, replace the in-memory `state` object in `server.js` with a database (e.g., Vercel KV, PlanetScale, Supabase).
- **Vercel free tier**: Serverless functions have a 10-second execution timeout on the free tier. The backend operations are fast and well within this limit.
