# 🚀 Quick Start Guide

## Prerequisites
- Node.js (v16+)
- MongoDB Atlas account (connection string provided)
- Ganache CLI or Ganache GUI

## 1. Install Ganache
\`\`\`bash
npm install -g ganache-cli
\`\`\`

## 2. Start Ganache
\`\`\`bash
ganache-cli -p 7545 -h 0.0.0.0
\`\`\`

## 3. Clone and Setup
\`\`\`bash
git clone <repository-url>
cd tourist-safety-system
npm run setup
\`\`\`

## 4. Start the System
\`\`\`bash
npm start
\`\`\`

## 5. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Admin Login**: username: `admin`, password: `admin123`

## 🔧 Manual Setup (Alternative)

### Backend
\`\`\`bash
cd backend
npm install
npm run dev
\`\`\`

### Frontend
\`\`\`bash
cd frontend
npm install
npm start
\`\`\`

### Blockchain
\`\`\`bash
cd blockchain
npm install
npm run deploy
\`\`\`

## 📊 Features Available
- ✅ Tourist Registration with Blockchain ID
- ✅ Real-time Location Tracking
- ✅ SOS Alert System
- ✅ Admin Dashboard with Analytics
- ✅ Interactive Maps with Leaflet
- ✅ IoT Simulation System
- ✅ MongoDB Integration
- ✅ Smart Contract Integration

## 🚨 Troubleshooting
- **Port 5000 in use**: Kill the process or change PORT in backend/.env
- **Port 3000 in use**: The frontend will prompt to use a different port
- **Ganache not running**: Start Ganache on port 7545
- **Database errors**: Run `npm run cleanup` to fix MongoDB issues
- **Contract deployment fails**: Ensure Ganache is running and restart

## 📱 Usage
1. Register tourists through the registration form
2. View real-time tracking in the admin dashboard
3. Monitor SOS alerts on the map
4. Use analytics to track tourist patterns
5. Control IoT simulations from the analytics tab
