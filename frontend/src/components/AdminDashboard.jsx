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
import TouristDetailModal from "./TouristDetailModal"
import AdminWalletPool from "../pages/AdminWalletPool"
import AdminTxQueue from "../pages/AdminTxQueue"
import AdminRiskZones from "../pages/AdminRiskZones"
import { useLanguage } from "../contexts/LanguageContext"
import websocketService from "../services/websocketService"

const AdminDashboard = () => {
  const { t } = useLanguage()
  const [tourists, setTourists] = useState([])
  const [filteredTourists, setFilteredTourists] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all") // 'all', 'active', 'sos'
  const [activeTab, setActiveTab] = useState("overview") // 'overview', 'map', 'analytics', 'wallet-pool', 'tx-queue', 'risk-zones'
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [analytics, setAnalytics] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [efirs, setEfirs] = useState([])
  const [selectedTourist, setSelectedTourist] = useState(null)
  const [safetyScores, setSafetyScores] = useState({})
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    sosAlerts: 0,
    areas: {},
  })

  const apiBase = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'

  const fetchTourists = useCallback(async () => {
    try {
      // Use public endpoint for tourist locations
      const response = await fetch(`${apiBase}/api/public/tourist-locations`)
      const result = await response.json()

      if (result.success) {
        // Transform public data to match expected format
        const transformedTourists = result.tourists.map(tourist => ({
          ...tourist,
          blockchainId: tourist.id,
          latitude: tourist.latitude,
          longitude: tourist.longitude,
          displayLatitude: tourist.latitude,
          displayLongitude: tourist.longitude,
          isActive: true,
          name: tourist.name,
          aadharOrPassport: 'PROTECTED', // PII is protected in public endpoint
          tripStart: new Date().toISOString(),
          tripEnd: new Date(Date.now() + 24*60*60*1000).toISOString(),
          emergencyContact: 'PROTECTED'
        }))
        setTourists(transformedTourists)
        updateStats(transformedTourists)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error("Failed to fetch tourists:", error)
    } finally {
      setIsLoading(false)
    }
  }, [apiBase])

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/analytics`)
      const result = await response.json()

      if (result.success) {
        setAnalytics(result.analytics)
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    }
  }, [])

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/alerts`)
      const result = await response.json()
      if (result.success) setAlerts(result.alerts || [])
    } catch (e) {
      console.error("Failed to fetch alerts:", e)
    }
  }, [])

  const fetchEfirs = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/efir`)
      const result = await response.json()
      if (result.success) setEfirs(result.efirs || [])
    } catch (e) {
      console.error("Failed to fetch e-firs:", e)
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

  // Initial data fetch
  useEffect(() => {
    fetchTourists()
    fetchAnalytics()
    fetchAlerts()
    fetchEfirs()
    
    // Connect WebSocket for real-time updates
    websocketService.connect()
    
    // Listen for real-time updates
    websocketService.on('location_update', (data) => {
      setTourists(prevTourists => 
        prevTourists.map(tourist => 
          tourist.blockchainId === data.touristId 
            ? { ...tourist, latitude: data.latitude, longitude: data.longitude, 
                displayLatitude: data.displayLatitude, displayLongitude: data.displayLongitude,
                sosActive: data.tourist?.sosActive || tourist.sosActive }
            : tourist
        )
      )
      setLastUpdate(new Date())
    })
    
    websocketService.on('sos_alert', (data) => {
      setTourists(prevTourists => 
        prevTourists.map(tourist => 
          tourist.blockchainId === data.touristId 
            ? { ...tourist, sosActive: true }
            : tourist
        )
      )
      setLastUpdate(new Date())
    })
    
    return () => {
      websocketService.disconnect()
    }
  }, [])

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTourists()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [fetchTourists])

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
      const response = await fetch(`${apiBase}/api/tourists/${touristId}/reset-sos`, {
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

  const generateEFIR = async (touristId) => {
    try {
      const response = await fetch(`${apiBase}/api/efir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ touristId, reason: "Generated from admin dashboard" }),
      })
      const result = await response.json()
      if (result.success) {
        fetchEfirs()
        alert(`E-FIR created: ${result.efir.id}`)
      }
    } catch (error) {
      console.error("Failed to create E-FIR:", error)
    }
  }

  const fetchSafetyScore = async (touristId) => {
    try {
      const response = await fetch("http://localhost:5000/api/ml/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: [{
            tourist_id: touristId.toString(),
            timestamp: new Date().toISOString(),
            latitude: 28.6139,
            longitude: 77.2090,
            speed_m_s: 1.0,
            time_of_day_bucket: "afternoon",
            distance_from_itinerary: 0,
            time_since_last_fix: 60,
            avg_speed_last_15min: 1.0,
            area_risk_score: 0.3,
            prior_incidents_count: 0,
            days_into_trip: 1,
            is_in_restricted_zone: false,
            sos_flag: false,
            age: 30,
            sex_encoded: 0,
            days_trip_duration: 5
          }]
        })
      })
      const result = await response.json()
      if (result.success && result.results.length > 0) {
        setSafetyScores(prev => ({
          ...prev,
          [touristId]: result.results[0]
        }))
      }
    } catch (error) {
      console.error("Failed to fetch safety score:", error)
    }
  }

  const getSafetyBandColor = (band) => {
    switch (band) {
      case 'high': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  useEffect(() => {
    fetchTourists()
    fetchAnalytics()
    fetchAlerts()
    fetchEfirs()
    
    // Setup WebSocket connection
    websocketService.connect()
    
    // Listen for real-time updates
    const handleLocationUpdate = (data) => {
      if (data.type === 'location_update') {
        setTourists(prev => prev.map(tourist => 
          tourist.blockchainId === data.touristId ? data.tourist : tourist
        ))
      }
    }
    
    const handleSOSAlert = (data) => {
      if (data.type === 'sos_alert') {
        setTourists(prev => prev.map(tourist => 
          tourist.blockchainId === data.touristId ? data.tourist : tourist
        ))
        // Show notification
        if (data.tourist) {
          alert(`SOS Alert: ${data.tourist.name} (ID: ${data.touristId})`)
        }
      }
    }
    
    const handleAnomalyAlert = (data) => {
      if (data.type === 'anomaly_alert') {
        setAlerts(prev => [data.alert, ...prev])
        // Show notification for high severity alerts
        if (data.alert.severity === 'high') {
          alert(`High Priority Alert: ${data.alert.message}`)
        }
      }
    }
    
    websocketService.on('location_update', handleLocationUpdate)
    websocketService.on('sos_alert', handleSOSAlert)
    websocketService.on('anomaly_alert', handleAnomalyAlert)
    
    const interval = setInterval(() => {
      fetchTourists()
      fetchAnalytics()
      fetchAlerts()
      fetchEfirs()
    }, 30000) // Reduced frequency since we have real-time updates
    
    return () => {
      clearInterval(interval)
      websocketService.off('location_update', handleLocationUpdate)
      websocketService.off('sos_alert', handleSOSAlert)
      websocketService.off('anomaly_alert', handleAnomalyAlert)
      websocketService.disconnect()
    }
  }, [fetchTourists, fetchAnalytics, fetchAlerts, fetchEfirs])

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
                  {t('overview')}
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
                  {t('liveMap')}
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
                  {t('analytics')}
                </div>
              </button>
              <button
                onClick={() => setActiveTab("wallet-pool")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "wallet-pool"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Wallet Pool
                </div>
              </button>
              <button
                onClick={() => setActiveTab("tx-queue")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "tx-queue"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  TX Queue
                </div>
              </button>
              <button
                onClick={() => setActiveTab("risk-zones")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "risk-zones"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Risk Zones
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
              <StatCard title={t('totalTourists')} value={stats.total} icon={Users} color="bg-emerald-600" trend="+12%" />
              <StatCard title={t('activeTourists')} value={stats.active} icon={MapPin} color="bg-blue-600" trend="+5%" />
              <StatCard title={t('sosAlerts')} value={stats.sosAlerts} icon={AlertTriangle} color="bg-red-600" />
              <StatCard
                title={t('areas')}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Alerts</h3>
                <div className="space-y-3 max-h-80 overflow-auto">
                  {alerts.length === 0 && <p className="text-gray-500">No alerts</p>}
                  {alerts.slice().reverse().map((a, idx) => (
                    <div key={idx} className="flex items-start justify-between p-3 rounded-lg border">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{a.type.replaceAll('_', ' ')}</div>
                        <div className="text-xs text-gray-500">Tourist #{a.touristId} • {new Date(a.timestamp).toLocaleString()}</div>
                        <div className="text-sm text-gray-700 mt-1">{a.message}</div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${a.severity === 'warn' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{a.severity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent E-FIRs</h3>
                <div className="space-y-3 max-h-80 overflow-auto">
                  {efirs.length === 0 && <p className="text-gray-500">No E-FIRs</p>}
                  {efirs.slice().reverse().map((e) => (
                    <div key={e.id} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-900">{e.id}</div>
                        <div className="text-xs text-gray-500">{new Date(e.generatedAt).toLocaleString()}</div>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Tourist #{e.touristId} • {e.name}</div>
                      <div className="text-sm text-gray-700 mt-1">{e.reason}</div>
                    </div>
                  ))}
                </div>
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
                          Safety Score
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            {safetyScores[tourist.blockchainId] ? (
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSafetyBandColor(safetyScores[tourist.blockchainId].safety_band)}`}>
                                  {safetyScores[tourist.blockchainId].safety_band.toUpperCase()}
                                </span>
                                <span className="text-sm text-gray-600">
                                  {Math.round(safetyScores[tourist.blockchainId].predicted_safety)}
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => fetchSafetyScore(tourist.blockchainId)}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Get Score
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => setSelectedTourist(tourist)}
                                className="text-emerald-600 hover:text-emerald-900 p-1" 
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className="text-blue-600 hover:text-blue-900 p-1" title="Contact">
                                <Phone className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => generateEFIR(tourist.blockchainId)}
                                className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                              >
                                Generate E-FIR
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

        {activeTab === "map" && <TouristMap tourists={tourists} onResetSOS={resetSOS} alerts={alerts} />}

        {activeTab === "analytics" && <AnalyticsDashboard />}

        {activeTab === "wallet-pool" && <AdminWalletPool />}

        {activeTab === "tx-queue" && <AdminTxQueue />}

        {activeTab === "risk-zones" && <AdminRiskZones />}
      </div>

      {/* Tourist Detail Modal */}
      <TouristDetailModal
        tourist={selectedTourist}
        isOpen={!!selectedTourist}
        onClose={() => setSelectedTourist(null)}
      />
    </div>
  )
}

export default AdminDashboard
