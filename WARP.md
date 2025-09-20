# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Architecture Overview

TouristGuardian is a full-stack smart tourist safety monitoring system with blockchain identity management. The system integrates React frontend, Node.js/Express backend, MongoDB database, Solidity smart contracts, and Python ML services.

### Core Components

- **Frontend (React + Tailwind + Leaflet)**: Admin dashboard with real-time map visualization, tourist registration, SOS monitoring, and analytics
- **Backend (Node.js + Express + MongoDB)**: REST API, WebSocket server, IoT simulation engine, wallet pool management, and transaction queue
- **Blockchain Layer (Solidity + Truffle + Ganache)**: Tourist identity registry, location tracking, and SOS event management on Ethereum
- **ML Service (Python + FastAPI)**: Risk assessment, anomaly detection, and predictive analytics using LightGBM
- **Mobile App (React Native + Expo)**: Tourist-facing mobile application for registration and SOS triggers

### Key Architecture Patterns

1. **Microservices Architecture**: Each component (backend, frontend, ML, mobile) runs independently with clear API boundaries
2. **Event-Driven System**: WebSocket connections for real-time updates, blockchain events, and IoT simulation
3. **Queue-Based Processing**: Transaction queue with retry logic for reliable blockchain operations
4. **Wallet Pool Management**: Secure wallet assignment system using encrypted private keys
5. **Multi-Layer Security**: JWT authentication, API key protection, PII encryption, and audit logging

## Common Development Commands

### Environment Setup
```bash
# Start Ganache blockchain (deterministic accounts)
ganache --wallet.mnemonic "bonus predict custom timber never advice casual glove predict hand burger away" --wallet.totalAccounts 10 --chain.chainId 1337 --port 8545 --host 127.0.0.1

# Deploy smart contracts
cd blockchain
truffle migrate --reset --network development

# Set up environment variables
cp env.example .env
# Edit .env with MongoDB URI, contract addresses, and private keys
```

### Development Workflow
```bash
# Install all dependencies
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd blockchain && npm install && cd ..

# Start all services (recommended)
npm run dev

# Or start services individually
cd backend && npm run dev     # Backend on :5000
cd frontend && npm start      # Frontend on :3000

# Start ML service (optional)
cd ml
pip install -r requirements.txt
python service.py             # ML service on :8001
```

### Testing Commands
```bash
# Run blockchain tests
cd blockchain
truffle test

# Test API endpoints
curl http://localhost:5000/health
curl http://localhost:5000/api/wallet-pool/status

# Check system diagnostics
node diagnostic_check.ps1
```

### Database Management
```bash
# Clean up MongoDB collections
node scripts/cleanup-database.js

# Seed sample data
cd backend
node seed-zones.js

# Clean up tourist records
node scripts/cleanup-tourists.js
```

### Blockchain Operations
```bash
# Compile contracts
cd blockchain
truffle compile

# Deploy to different networks
truffle migrate --network development --reset
truffle migrate --network testnet

# Interact with deployed contracts
truffle console
```

## Code Organization

### Backend Services Architecture
- `services/iotSimulation.js`: Tourist location simulation with 5-second intervals
- `services/walletPool.js`: Manages 20 Ganache wallets with AES encryption
- `services/txQueue.js`: Blockchain transaction queue with retry logic and exponential backoff
- `services/geoFencingService.js`: Geofence zone management and breach detection
- `services/anomalyDetector.js`: ML-powered anomaly detection for tourist behavior
- `middleware/auth.js`: JWT authentication with role-based access (admin, police, tourism)
- `middleware/audit.js`: Comprehensive audit logging for security and compliance

### Frontend Component Structure
- `components/AdminDashboard.jsx`: Main admin interface with tourist management
- `components/TouristMap.jsx`: Leaflet-based real-time map with SOS markers
- `components/AnalyticsDashboard.jsx`: Charts and KPIs using Recharts
- `pages/AdminTxQueue.jsx`: Transaction queue monitoring interface
- `pages/AdminWalletPool.jsx`: Wallet pool management dashboard
- `contexts/LanguageContext.jsx`: Multi-language support system

### Smart Contract Architecture
- `TouristRegistry.sol`: Core contract managing tourist identities, location updates, and SOS events
- Key functions: `registerTourist()`, `updateMyLocation()`, `triggerMySOS()`, `resetSOS()` (admin)
- Event logging: `TouristRegistered`, `LocationUpdated`, `SOSTriggered`, `SOSReset`
- Security: Admin-only functions, registered-user validation, hash-based PII protection

### Database Schema Patterns
- **Tourist Model**: `blockchainId`, `walletAddress`, `location`, `sosActive`, `isActive`, `deviceTracked`
- **WalletPool Model**: `index`, `address`, `status` (available/assigned), `assignedToTouristId`, `expiresAt`
- **TXQueue Model**: `touristId`, `txType`, `payload`, `evidenceHash`, `status`, `attempts`, `lastError`
- **GeofenceAlert Model**: Zone breach notifications with severity levels and automated responses

## Development Guidelines

### Environment Configuration
- Use `env.example` as template for `.env` files
- Never commit actual `.env` files or private keys
- Default Ganache mnemonic is for development only
- MongoDB Atlas connection strings should use proper credentials
- JWT secrets and API keys must be unique per environment

### Blockchain Development
- Always use `truffle migrate --reset` when redeploying contracts during development
- Update `CONTRACT_ADDRESS` in backend `.env` after each deployment
- Ganache should run with deterministic accounts for consistent testing
- Use `--no-pager` flag with git commands to avoid pagination issues
- Test contract interactions in `truffle console` before API integration

### Security Considerations
- Private keys are AES-encrypted in `secrets/wallets.json`
- PII is never stored on blockchain (only SHA256 hashes)
- JWT tokens expire after 1 hour and require refresh
- API endpoints use role-based authorization (admin, police, tourism)
- Audit logs capture all sensitive operations with timestamps

### Real-time Features
- WebSocket server on `/ws` path broadcasts location updates every 5 seconds
- IoT simulation generates realistic tourist movement patterns
- SOS triggers are broadcasted immediately to all connected clients
- Admin dashboard receives live updates without page refresh

### Testing Strategy
- Backend uses demo credentials: admin/admin123, police/police123, tourism/tourism123
- Frontend includes dev-only features like manual SOS triggers and simulation controls
- ML service provides sample risk scores for testing
- Mobile app connects to local development server via IP address

### Performance Optimizations
- MongoDB connections use connection pooling (10 max, 2 min)
- Blockchain operations are queued to avoid network congestion
- Frontend uses React's built-in optimization (React.memo, useMemo)
- WebSocket connections are managed efficiently with cleanup on disconnect
- IoT simulation respects device-tracked flags to avoid override

## Troubleshooting Common Issues

### Blockchain Connection Issues
- Ensure Ganache is running on correct port (8545)
- Verify `GANACHE_RPC_URL` matches Ganache host/port
- Check that admin wallet has sufficient ETH balance
- Confirm contract address matches deployed contract

### Database Connection Problems
- Verify MongoDB Atlas connection string format
- Check network connectivity to MongoDB servers
- Ensure database user has proper read/write permissions
- Monitor connection pool exhaustion in high-traffic scenarios

### Frontend Development Issues
- React development server uses proxy to backend (configured in package.json)
- Source maps are disabled for performance (GENERATE_SOURCEMAP=false)
- Tailwind CSS requires PostCSS configuration for proper building
- Leaflet maps need proper CSS imports for marker display

### Mobile App Development
- Use IP address (not localhost) in `EXPO_PUBLIC_API_BASE_URL`
- Expo development requires proper network configuration
- Mobile SOS features require device location permissions
- Test on physical devices for accurate GPS simulation

## System Integration Points

The system uses several integration points that require coordination:

1. **Wallet Assignment Flow**: Registration → Wallet Pool → Blockchain Transaction → Database Update
2. **Location Update Chain**: IoT Simulation → Database → WebSocket → Frontend Map
3. **SOS Trigger Process**: Mobile/Simulation → API → Database → Blockchain Queue → Admin Dashboard
4. **ML Risk Assessment**: Tourist Data → Python ML Service → Risk Score → Frontend Analytics
5. **Audit Trail**: All Operations → Audit Middleware → Log Files → Compliance Reports

Understanding these flows is crucial for debugging issues and implementing new features effectively.