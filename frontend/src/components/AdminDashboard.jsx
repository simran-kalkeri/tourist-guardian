"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Users,
  MapPin,
  AlertTriangle,
  Shield,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  Phone,
  Eye,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Activity,
  User,
  BarChart3,
} from "lucide-react"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import TouristMap from "./TouristMap"
import AnalyticsDashboard from "./AnalyticsDashboard"

const AdminDashboard = () => {
  const [tourists, setTourists] = useState([])
  const [filteredTourists, setFilteredTourists] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all") // 'all', 'active', 'sos'
  const [activeTab, setActiveTab] = useState("overview") // 'overview', 'map', 'analytics'
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [analytics, setAnalytics] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    sosAlerts: 0,
    areas: {},
  })

  const fetchTourists = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:5000/api/tourists")
      const result = await response.json()

      if (result.success) {
        setTourists(result.tourists)
        updateStats(result.tourists)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error("Failed to fetch tourists:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:5000/api/analytics")
      const result = await response.json()

      if (result.success) {
        setAnalytics(result.analytics)
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    }
  }, [])

  const updateStats = (touristData) => {
    const total = touristData.length
    const active = touristData.filter((t) => t.isActive).length
    const sosAlerts = touristData.filter((t) => t.sosActive).length

    const areas = touristData.reduce((acc, tourist) => {
      const area = getAreaFromCoordinates(tourist.latitude, tourist.longitude)
      acc[area] = (acc[area] || 0) + 1
      return acc
    }, {})

    setStats({ total, active, sosAlerts, areas })
  }

  const getAreaFromCoordinates = (lat, lng) => {
    if (lat === 0 && lng === 0) return "Unknown"
    if (lat > 20) return "Mountains"
    if (lat > 10) return "Downtown"
    if (lat > 0) return "Beach"
    return "Historic"
  }

  useEffect(() => {
    let filtered = tourists

    if (searchTerm) {
      filtered = filtered.filter(
        (tourist) =>
          tourist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tourist.blockchainId.toString().includes(searchTerm) ||
          tourist.aadharOrPassport.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (filterStatus !== "all") {
      if (filterStatus === "sos") {
        filtered = filtered.filter((tourist) => tourist.sosActive)
      } else if (filterStatus === "active") {
        filtered = filtered.filter((tourist) => tourist.isActive && !tourist.sosActive)
      }
    }

    setFilteredTourists(filtered)
  }, [tourists, searchTerm, filterStatus])

  const resetSOS = async (touristId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/tourists/${touristId}/reset-sos`, {
        method: "POST",
      })

      const result = await response.json()

      if (result.success) {
        setTourists((prev) =>
          prev.map((tourist) => (tourist.blockchainId === touristId ? { ...tourist, sosActive: false } : tourist)),
        )
      }
    } catch (error) {
      console.error("Failed to reset SOS:", error)
    }
  }

  useEffect(() => {
    fetchTourists()
    fetchAnalytics()
    const interval = setInterval(() => {
      fetchTourists()
      fetchAnalytics()
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchTourists, fetchAnalytics])

  const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <div className="flex items-center mt-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">{trend}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-emerald-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Tourist Safety Monitoring System</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Activity className="w-4 h-4" />
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
              <button
                onClick={fetchTourists}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Refresh data"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab("overview")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "overview"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Overview
                </div>
              </button>
              <button
                onClick={() => setActiveTab("map")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "map"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Live Map
                </div>
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "analytics"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Analytics & IoT
                </div>
              </button>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard title="Total Tourists" value={stats.total} icon={Users} color="bg-emerald-600" trend="+12%" />
              <StatCard title="Active Tourists" value={stats.active} icon={MapPin} color="bg-blue-600" trend="+5%" />
              <StatCard title="SOS Alerts" value={stats.sosAlerts} icon={AlertTriangle} color="bg-red-600" />
              <StatCard
                title="Areas Covered"
                value={Object.keys(stats.areas).length}
                icon={Shield}
                color="bg-purple-600"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">SOS Alerts Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics?.sosAlertsOverTime || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="alerts" stroke="#dc2626" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tourists by Area</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={
                        analytics
                          ? Object.entries(analytics.areaStats).map(([area, stats], index) => ({
                              area,
                              tourists: stats.total,
                              color: ["#059669", "#10b981", "#f59e0b", "#dc2626", "#8b5cf6"][index % 5],
                            }))
                          : []
                      }
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ area, tourists }) => `${area}: ${tourists}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="tourists"
                    >
                      {analytics &&
                        Object.entries(analytics.areaStats).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={["#059669", "#10b981", "#f59e0b", "#dc2626", "#8b5cf6"][index % 5]}
                          />
                        ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h3 className="text-lg font-semibold text-gray-900">Tourist Management</h3>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search tourists..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-full sm:w-64"
                      />
                    </div>

                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none bg-white"
                      >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="sos">SOS Alerts</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-600">Loading tourists...</span>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tourist
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Trip Dates
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTourists.map((tourist) => (
                        <tr key={tourist.blockchainId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-emerald-600" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{tourist.name}</div>
                                <div className="text-sm text-gray-500">{tourist.aadharOrPassport}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-mono text-gray-900">#{tourist.blockchainId}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span>{new Date(tourist.tripStart).toLocaleDateString()}</span>
                              <span className="text-gray-400">-</span>
                              <span>{new Date(tourist.tripEnd).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              {tourist.latitude && tourist.longitude ? (
                                <span>
                                  {tourist.latitude.toFixed(4)}, {tourist.longitude.toFixed(4)}
                                </span>
                              ) : (
                                <span className="text-gray-400">No location</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {tourist.sosActive ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                SOS Alert
                              </span>
                            ) : tourist.isActive ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button className="text-emerald-600 hover:text-emerald-900 p-1" title="View Details">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className="text-blue-600 hover:text-blue-900 p-1" title="Contact">
                                <Phone className="w-4 h-4" />
                              </button>
                              {tourist.sosActive && (
                                <button
                                  onClick={() => resetSOS(tourist.blockchainId)}
                                  className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                                >
                                  Reset SOS
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {!isLoading && filteredTourists.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No tourists found matching your criteria</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === "map" && <TouristMap tourists={tourists} onResetSOS={resetSOS} />}

        {activeTab === "analytics" && <AnalyticsDashboard />}
      </div>
    </div>
  )
}

export default AdminDashboard
