# Smart Tourist Safety Monitoring & Incident Response System

A comprehensive full-stack application for monitoring tourist safety with blockchain integration, real-time location tracking, and emergency response capabilities.

## 🏗️ Architecture

- **Backend**: Express.js with MongoDB
- **Frontend**: React with Tailwind CSS
- **Blockchain**: Solidity smart contracts with Truffle/Ganache
- **Maps**: Leaflet for real-time location visualization
- **Database**: MongoDB Atlas
- **Real-time**: IoT simulation with automatic location updates

## 🚀 Features

### Tourist Registration
- Secure registration with blockchain ID generation
- Trip duration tracking with automatic cleanup
- Emergency contact management
- Document verification (Passport/Aadhaar)

### Admin Dashboard
- Real-time tourist monitoring
- Interactive Leaflet maps with SOS alerts
- Advanced analytics and charts
- Search and filter capabilities
- SOS alert management

### Blockchain Integration
- Decentralized tourist ID system
- Immutable location tracking
- Smart contract-based SOS alerts
- Automated cleanup of expired records

### IoT Simulation
- Realistic location updates every 5 seconds
- Random SOS trigger simulation
- Configurable simulation parameters
- Real-time data synchronization

## 📦 Installation & Setup

### Prerequisites
- Node.js (v16+)
- MongoDB Atlas account
- Ganache CLI
- Truffle Suite

### Backend Setup
\`\`\`bash
cd backend
npm install
cp .env.example .env
# Configure your MongoDB URI and other environment variables
npm start
\`\`\`

### Blockchain Setup
\`\`\`bash
# Install Ganache CLI globally
npm install -g ganache-cli

# Start Ganache
ganache-cli --deterministic --accounts 10 --host 0.0.0.0

# Deploy contracts
cd blockchain
npm install
truffle migrate --reset
\`\`\`

### Frontend Setup
\`\`\`bash
cd frontend
npm install
npm start
\`\`\`

## 🔧 Configuration

### Environment Variables

**Backend (.env)**
\`\`\`
PORT=5000
MONGODB_URI=mongodb+srv://siteadmin:officer123@cluster0.l6busjy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
CONTRACT_ADDRESS=<deployed_contract_address>
ADMIN_PRIVATE_KEY=<ganache_admin_private_key>
BLOCKCHAIN_RPC_URL=http://localhost:8545
\`\`\`

**Frontend**
- Update API endpoints in components to match your backend URL
- Configure blockchain connection parameters

## 🎯 Usage

### Admin Access
- Username: `admin`
- Password: `admin123`

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tourists/register` | Register new tourist |
| GET | `/api/tourists` | Get all tourists (Admin) |
| POST | `/api/tourists/:id/location` | Update tourist location |
| POST | `/api/tourists/:id/sos` | Trigger SOS alert |
| POST | `/api/tourists/:id/reset-sos` | Reset SOS alert (Admin) |
| POST | `/api/cleanup-expired` | Clean expired tourists |

### Smart Contract Functions
- `registerTourist()` - Register new tourist on blockchain
- `updateLocation()` - Update tourist location
- `triggerSOS()` - Activate emergency alert
- `resetSOS()` - Deactivate emergency alert (Admin only)
- `deleteTourist()` - Remove expired tourist records

## 🗺️ Map Features

- **Real-time Location Tracking**: Live updates every 5 seconds
- **SOS Alert Visualization**: Red markers for emergency situations
- **Interactive Popups**: Tourist details and quick actions
- **Heatmap Overlay**: Density visualization of tourist locations
- **Auto-fitting Bounds**: Automatic map adjustment for optimal viewing

## 📊 Analytics Dashboard

- **Tourist Statistics**: Active count, SOS alerts, registrations
- **Location Distribution**: Charts showing tourist density by area
- **SOS Alert Timeline**: Historical emergency response data
- **Real-time Monitoring**: Live updates with simulation controls

## 🔒 Security Features

- **Blockchain Immutability**: Tamper-proof tourist records
- **Admin Authentication**: Secure access to sensitive operations
- **Data Validation**: Comprehensive input validation and sanitization
- **Error Handling**: Robust error management and logging

## 🧪 Testing

The system includes IoT simulation for testing:
- Automatic location updates for all registered tourists
- Random SOS alert generation
- Configurable simulation parameters
- Real-time data synchronization

## 📱 Responsive Design

- Mobile-first approach
- Tailwind CSS for consistent styling
- Professional government/enterprise UI
- Accessibility compliance

## 🔄 Real-time Updates

- Frontend polls backend every 5 seconds
- IoT simulation generates realistic data
- Blockchain synchronization
- Live map updates and notifications

## 🛠️ Development

### Project Structure
\`\`\`
├── backend/           # Express.js API server
├── frontend/          # React application
├── contracts/         # Solidity smart contracts
├── blockchain/        # Truffle configuration and utilities
└── migrations/        # Contract deployment scripts
\`\`\`

### Key Technologies
- **Express.js**: RESTful API development
- **React**: Modern frontend framework
- **MongoDB**: Document database
- **Solidity**: Smart contract development
- **Leaflet**: Interactive maps
- **Recharts**: Data visualization
- **Tailwind CSS**: Utility-first styling

## 📞 Support

For issues or questions, refer to the comprehensive error handling and logging systems built into the application.

---

**Built with precision for competition-winning performance** 🏆
