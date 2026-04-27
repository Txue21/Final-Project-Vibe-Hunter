# Deploying to Hostinger

## Step 1: Build the Production Bundle

```bash
cd client
npm run build
```

This creates a `dist/` folder with optimized production files.

## Step 2: Update API Base URL for Production

Before building, update the API URL in `vite.config.js`:

**For Production Build:**
The proxy only works in development. For production, update `api.js`:

```js
// src/services/api.js
const API_BASE = import.meta.env.DEV 
  ? '/api'  // Development: uses Vite proxy
  : 'https://vibe-hunter.com/api';  // Production: direct API calls
```

## Step 3: Upload to Hostinger

### Via File Manager (Easy):

1. Log into Hostinger: https://hpanel.hostinger.com
2. Go to **File Manager**
3. Navigate to `public_html/` (or create `public_html/battleship/`)
4. Upload all files from `client/dist/` folder
5. Your app will be live at: `https://vibe-hunter.com/` (or `/battleship/`)

### Via FTP (Recommended):

1. Get FTP credentials from Hostinger cPanel
2. Use FileZilla or any FTP client
3. Connect to your server
4. Upload `dist/` contents to `public_html/battleship/`

### Via SSH (Advanced):

```bash
# Connect to Hostinger via SSH
ssh u579280620@vibe-hunter.com

# Navigate to public_html
cd public_html

# Create battleship directory
mkdir battleship
cd battleship

# Upload files (from your local machine)
scp -r client/dist/* u579280620@vibe-hunter.com:~/public_html/battleship/
```

## Step 4: Configure .htaccess for React Router

Create `.htaccess` in `public_html/battleship/`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /battleship/
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /battleship/index.html [L]
</IfModule>
```

## Step 5: Test Your Deployment

1. Open: `https://vibe-hunter.com/battleship/`
2. Register a player
3. Share the URL with your teammate
4. Both of you can now play!

## Alternative: Quick Deploy Options

### Option A: Vercel (Fastest - 2 minutes)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd client
vercel
```

Follow prompts:
- Link to existing project: No
- Project name: battleship-client
- Directory: `./` (current)
- Build command: `npm run build`
- Output directory: `dist`

You'll get a URL like: `https://battleship-client.vercel.app`

### Option B: Netlify Drop

1. Build: `npm run build`
2. Go to: https://app.netlify.com/drop
3. Drag `client/dist/` folder
4. Get instant URL: `https://random-name.netlify.app`

### Option C: GitHub Pages

```bash
# Install gh-pages
npm install -g gh-pages

# Add to package.json scripts:
"deploy": "gh-pages -d dist"

# Build and deploy
npm run build
npm run deploy
```

## CORS Configuration

If you get CORS errors, update your backend `common.php`:

```php
// Allow your frontend domain
header("Access-Control-Allow-Origin: https://your-frontend-url.com");
```

Or allow all (for testing):

```php
header("Access-Control-Allow-Origin: *");
```

## Environment Variables

Create `.env.production` in `client/`:

```env
VITE_API_BASE_URL=https://vibe-hunter.com/api
```

Update `api.js`:

```js
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
```

## Troubleshooting

### Issue: API calls fail (404)
- **Fix**: Update `API_BASE` in `api.js` to full URL

### Issue: Blank page after deployment
- **Fix**: Check browser console for errors
- **Fix**: Verify `base` in `vite.config.js` matches your subdirectory

### Issue: CORS errors
- **Fix**: Update backend CORS headers to allow your frontend domain

### Issue: 404 on page refresh
- **Fix**: Add `.htaccess` rewrite rules (see Step 4)

## Quick Test Checklist

After deployment:
- ✅ Registration works
- ✅ Can create game
- ✅ Can join game  
- ✅ Ship placement works
- ✅ Firing works
- ✅ Move history updates
- ✅ Winner detection works

## Demo Day Setup

For your April 17 demo:
1. Deploy to production URL
2. Test with teammate beforehand
3. Have 2-3 browser tabs ready
4. Screen record the gameplay
5. Backup plan: Run locally and share screen

---

**Recommendation**: Deploy to Vercel NOW (takes 2 minutes) so you can test with your teammate Pascal over the next 4 days. Deploy to Hostinger later for final submission.
