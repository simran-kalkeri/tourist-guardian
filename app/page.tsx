export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🛡️ Smart Tourist Safety Monitoring System</h1>
          <p className="text-xl text-gray-600">Full-Stack Application with Blockchain Integration</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-emerald-50 p-6 rounded-xl">
            <h2 className="text-2xl font-semibold text-emerald-800 mb-4">🏗️ Architecture</h2>
            <ul className="space-y-2 text-emerald-700">
              <li>• Express.js Backend with MongoDB</li>
              <li>• React Frontend with Tailwind CSS</li>
              <li>• Solidity Smart Contracts</li>
              <li>• Leaflet Maps Integration</li>
              <li>• Real-time IoT Simulation</li>
            </ul>
          </div>

          <div className="bg-orange-50 p-6 rounded-xl">
            <h2 className="text-2xl font-semibold text-orange-800 mb-4">✨ Features</h2>
            <ul className="space-y-2 text-orange-700">
              <li>• Tourist Registration & Blockchain ID</li>
              <li>• Real-time Location Tracking</li>
              <li>• SOS Alert System</li>
              <li>• Admin Dashboard with Analytics</li>
              <li>• Interactive Maps & Heatmaps</li>
            </ul>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-xl mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">🚀 Quick Start</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="font-semibold text-gray-800 mb-2">1. Blockchain</h3>
              <code className="text-sm bg-gray-100 p-2 rounded block">ganache-cli --deterministic</code>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="font-semibold text-gray-800 mb-2">2. Backend</h3>
              <code className="text-sm bg-gray-100 p-2 rounded block">cd backend && npm start</code>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="font-semibold text-gray-800 mb-2">3. Frontend</h3>
              <code className="text-sm bg-gray-100 p-2 rounded block">cd frontend && npm start</code>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-6 rounded-xl mb-8">
          <h2 className="text-2xl font-semibold text-blue-800 mb-4">🔐 Admin Access</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-blue-700 mb-2">
                <strong>Username:</strong> admin
              </p>
              <p className="text-blue-700">
                <strong>Password:</strong> admin123
              </p>
            </div>
            <div>
              <p className="text-blue-700 mb-2">
                <strong>Frontend URL:</strong> http://localhost:3000
              </p>
              <p className="text-blue-700">
                <strong>Backend API:</strong> http://localhost:5000
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center space-x-4 bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-6 py-3 rounded-full">
            <span className="text-lg font-semibold">Competition-Ready Full-Stack Solution</span>
            <span className="text-2xl">🏆</span>
          </div>
          <p className="text-gray-600 mt-4">
            Complete system with blockchain integration, real-time monitoring, and professional UI
          </p>
        </div>

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-center">
            <strong>Note:</strong> This is the project overview page. The actual application runs separately as Express
            backend + React frontend. Follow the setup instructions in the README.md file.
          </p>
        </div>
      </div>
    </div>
  )
}
