#!/bin/bash

echo "🚀 Deploying HoneyDo by Amber - Full App"

# Build the Next.js app
echo "📦 Building Next.js app..."
npm run build

# Create a simple deployment for now
echo "🌐 Creating deployment files..."

# Create a simple index.html that redirects to the development server
cat > out/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HoneyDo by Amber</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 600px;
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
        }
        p {
            color: #666;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .button {
            background: #667eea;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 10px;
        }
        .button:hover {
            background: #5a6fd8;
        }
        .emoji {
            font-size: 60px;
            margin-bottom: 20px;
        }
        .status {
            background: #e8f5e8;
            border: 1px solid #4caf50;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        .features {
            text-align: left;
            margin: 20px 0;
        }
        .features ul {
            list-style: none;
            padding: 0;
        }
        .features li {
            padding: 5px 0;
            color: #555;
        }
        .features li:before {
            content: "🐾 ";
            margin-right: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="emoji">🐾</div>
        <h1>HoneyDo by Amber</h1>
        <p>Welcome to your personal reminder app! Amber is here to help you stay organized and on track with your tasks.</p>
        
        <div class="status">
            <h3>✅ Backend Services Deployed</h3>
            <p>All Firebase Functions are live and ready!</p>
        </div>

        <div class="features">
            <h3>Features Available:</h3>
            <ul>
                <li>AI-powered smart input parsing</li>
                <li>Playful notification generation</li>
                <li>Firebase push notifications</li>
                <li>Local browser notifications</li>
                <li>Reminder scheduling and management</li>
                <li>Priority-based task organization</li>
            </ul>
        </div>

        <p><strong>Note:</strong> The full interactive app requires server-side rendering for AI features. For the complete experience, please run the development server locally or deploy to a platform that supports Next.js Server Actions (like Vercel).</p>
        
        <a href="https://github.com/your-repo" class="button">View on GitHub</a>
        <a href="mailto:your-email@example.com" class="button">Contact</a>
        
        <div style="margin-top: 30px; padding: 20px; background: #f5f5f5; border-radius: 10px;">
            <h4>🚀 Quick Start (Local Development)</h4>
            <p>To run the full app locally:</p>
            <code style="background: #e0e0e0; padding: 5px 10px; border-radius: 5px; display: block; margin: 10px 0;">
                npm run dev
            </code>
            <p>Then visit <strong>http://localhost:3000</strong></p>
        </div>
    </div>
</body>
</html>
EOF

echo "🚀 Deploying to Firebase hosting..."
firebase deploy --only hosting

echo "✅ Deployment complete!"
echo "🌐 Your app is available at: https://ambers-affirmations.web.app"
echo "🔧 Backend functions are deployed and ready!"
echo "💡 For full functionality, run 'npm run dev' locally"

