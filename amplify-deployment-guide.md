# Deploying to AWS Amplify

This guide will walk you through deploying the Manufacturing Process Tracking System to AWS Amplify.

## 1. Deploying the Frontend to Amplify

### Step 1: Connect to GitHub
1. Go to the AWS Amplify Console
2. Click "Connect App"
3. Choose GitHub as your repository source
4. Authorize Amplify to access your repositories
5. Select this repository

### Step 2: Configure Build Settings
1. Branch: `main` (or your preferred branch)
2. Build settings: Use the existing `amplify.yml` file, which contains:

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

### Step 3: Configure Environment Variables
Add the following environment variables in Amplify:

- `VITE_API_URL`: URL of your backend API (see section 2 below)

## 2. Deploying the Backend Server

For this application to work properly, you need to deploy the backend separately. Here are your options:

### Option A: Deploy to AWS Elastic Beanstalk
1. Create a new Elastic Beanstalk environment with Node.js platform
2. Deploy the code with these changes:
   - Use `npm run build` to build the application
   - Set `NODE_ENV=production` in environment variables
   - Set the `DATABASE_URL` to connect to your PostgreSQL database

### Option B: Deploy to AWS EC2
1. Launch an EC2 instance with Amazon Linux 2 or Ubuntu
2. Install Node.js and npm
3. Clone the repository and run:
   ```
   npm install
   npm run build
   NODE_ENV=production DATABASE_URL=your_database_url npm start
   ```
4. Set up a load balancer and domain if needed

### Option C: Deploy as AWS Lambda Functions
1. Use AWS Serverless Application Model (SAM) or directly deploy to Lambda
2. Configure API Gateway to route requests to your Lambda functions
3. Set up environment variables

## 3. Setting Up the Database

1. Create a PostgreSQL database on AWS RDS
2. Configure the security group to allow connections from your backend
3. Run the database migrations: `npm run db:push`
4. Seed the database if needed: `npm run db:seed`

## 4. Making It Work Together

1. Once both the frontend and backend are deployed, set the `VITE_API_URL` in Amplify to your backend URL
2. In the backend, update the CORS settings in `server/index.ts` to allow requests from your Amplify app domain:
   ```javascript
   app.use((req, res, next) => {
     // Update this to your Amplify domain
     res.header("Access-Control-Allow-Origin", "https://your-amplify-app.amplifyapp.com");
     // rest of CORS config
   });
   ```

## Troubleshooting

### Frontend Issues
- Check browser console for errors
- Verify the `VITE_API_URL` is correctly set in Amplify
- Check if routes are working (SPA routing)

### Backend Issues
- Check server logs
- Verify database connection
- Ensure CORS is properly configured

### Database Issues
- Check security group settings
- Verify credentials
- Test connection from backend server

## Monitoring and Maintenance

- Set up CloudWatch to monitor your resources
- Configure alerts for error rates and latency
- Set up automated backups for your database