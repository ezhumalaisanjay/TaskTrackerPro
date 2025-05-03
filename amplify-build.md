# Amplify Deployment Instructions

For deploying this application on AWS Amplify, you'll need to make the following adjustments:

## 1. Package.json Adjustments

Update your package.json scripts to separate the build process:

```json
"scripts": {
  "dev": "tsx server/index.ts",
  "build": "vite build",
  "build:server": "esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "build:all": "npm run build && npm run build:server",
  "start": "NODE_ENV=production node dist/index.js",
  "check": "tsc",
  "db:push": "drizzle-kit push --force --config=./drizzle.config.ts",
  "db:seed": "tsx db/seed.ts"
}
```

## 2. Create a static build for Amplify

Since Amplify hosts static websites, you'll need to modify your frontend to work without the Express backend:

1. Create an API service wrapper in the client code that points to your API endpoint
2. Deploy the backend separately (AWS Lambda, EC2, or Elastic Beanstalk)
3. Configure environment variables in Amplify to point to your backend URL

## 3. Backend Deployment

For the backend, you'll need to:
1. Deploy the Express server to a separate AWS service (Lambda or EC2)
2. Set up the database connection via AWS RDS (PostgreSQL)
3. Configure CORS in your backend to allow requests from your Amplify domain

## 4. Database Configuration

Ensure your database connection is configured properly:
- Set DATABASE_URL in your backend environment
- Configure security groups to allow connections from your backend service

## 5. Frontend API Configuration

Update your API calls to use environment variables for the API URL:

```javascript
// In client/src/lib/queryClient.ts
const API_URL = import.meta.env.VITE_API_URL || "";

export async function apiRequest(method, path, data = null) {
  const url = API_URL + path;
  // Rest of your code
}
```

## 6. Environment Variables in Amplify

Set the following environment variables in Amplify:
- VITE_API_URL: URL of your backend API (e.g., https://api.yourdomain.com)
- Other necessary environment variables for your application

## 7. Build Commands for Amplify

In your amplify.yml:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

## 8. CORS Headers

Ensure your backend has proper CORS headers:

```javascript
// In server/index.ts
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "YOUR_AMPLIFY_DOMAIN");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});
```

## 9. Redirects for SPA Routing

Create a _redirects file in your public folder:

```
/* /index.html 200
```

This ensures that your React router works correctly when users navigate directly to a route.