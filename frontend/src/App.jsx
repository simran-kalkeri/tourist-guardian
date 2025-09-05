"use client"

import { useState } from "react"
import TouristRegistration from "./components/TouristRegistration"
import AdminLogin from "./components/AdminLogin"
import AdminDashboard from "./components/AdminDashboard"

function App() {
  const [currentView, setCurrentView] = useState("registration") // 'registration', 'admin-login', 'admin-dashboard'
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)

  const handleAdminLogin = (success) => {
    if (success) {
      setIsAdminAuthenticated(true)
      setCurrentView("admin-dashboard")
    }
  }

  const handleLogout = () => {
    setIsAdminAuthenticated(false)
    setCurrentView("registration")
  }

  return (
    <div className="App">
      {/* Navigation */}
      {currentView !== "admin-dashboard" && (
        <nav className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">TS</span>
                </div>
                <span className="font-semibold text-gray-900">Tourist Safety System</span>
              </div>

              <div className="flex items-center gap-4">
                {!isAdminAuthenticated ? (
                  <>
                    <button
                      onClick={() => setCurrentView("registration")}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        currentView === "registration"
                          ? "bg-emerald-100 text-emerald-700"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Register
                    </button>
                    <button
                      onClick={() => setCurrentView("admin-login")}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        currentView === "admin-login"
                          ? "bg-emerald-100 text-emerald-700"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Admin Login
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Logout
                  </button>
                )}
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className={currentView !== "admin-dashboard" ? "pt-16" : ""}>
        {currentView === "registration" && <TouristRegistration />}
        {currentView === "admin-login" && <AdminLogin onLogin={handleAdminLogin} />}
        {currentView === "admin-dashboard" && isAdminAuthenticated && <AdminDashboard />}
      </main>
    </div>
  )
}

export default App
