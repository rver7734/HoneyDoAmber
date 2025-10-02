#!/bin/bash

echo "Building Next.js app..."
npm run build

echo "Creating static export for Firebase hosting..."
# Create a simple index.html for now
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
            max-width: 500px;
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
    </style>
</head>
<body>
    <div class="container">
        <div class="emoji">🐾</div>
        <h1>HoneyDo by Amber</h1>
        <p>Welcome to your personal reminder app! Amber is here to help you stay organized and on track with your tasks.</p>
        <p><strong>Note:</strong> The full app with AI features requires server-side functionality. For the complete experience, please run the development server locally.</p>
        <a href="https://github.com/your-repo" class="button">View on GitHub</a>
        <a href="mailto:your-email@example.com" class="button">Contact</a>
    </div>
</body>
</html>
EOF

echo "Deploying to Firebase hosting..."
firebase deploy --only hosting

echo "Deployment complete!"
echo "Your app is available at: https://ambers-affirmations.web.app"

