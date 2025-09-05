"use client"

import { useState, useEffect } from "react"
import { Activity, TrendingUp, Users, MapPin, AlertTriangle, Clock, Play, Pause, BarChart3 } from "lucide-react"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from "recharts"

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null)
  const [simulationStats, setSimulationStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/analytics")
      const result = await response.json()

      if (result.success) {
        setAnalytics(result.analytics)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch simulation stats
  const fetchSimulationStats = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/simulation/stats")
      const result = await response.json()

      if (result.success) {
        setSimulationStats(result.stats)
      }
    } catch (error) {
      console.error("Failed to fetch simulation stats:", error)
    }
  }

  // Toggle simulation
  const toggleSimulation = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/simulation/toggle", {
        method: "POST",
      })

      const result = await response.json()

      if (result.success) {
        await fetchSimulationStats()
      }
    } catch (error) {
      console.error("Failed to toggle simulation:", error)
    }
  }

  // Auto-refresh every 10 seconds
  useEffect(() => {
    fetchAnalytics()
    fetchSimulationStats()

    const interval = setInterval(() => {
      fetchAnalytics()
      fetchSimulationStats()
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  // Prepare chart data
  const areaChartData = analytics
    ? Object.entries(analytics.areaStats).map(([area, stats]) => ({
        area,
        total: stats.total,
        sos: stats.sos,
        safe: stats.total - stats.sos,
      }))
    : []

  const hourlyActivityData = analytics?.hourlyActivity || []

  const MetricCard = ({ title, value, change, icon: Icon, color, subtitle }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          {change && (
            <div className="flex items-center mt-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">{change}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-600">Loading analytics...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics & IoT Simulation</h2>
          <p className="text-gray-600 mt-1">Real-time monitoring and simulation control</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">Last updated: {lastUpdate.toLocaleTimeString()}</div>

          {simulationStats && (
            <button
              onClick={toggleSimulation}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                simulationStats.isRunning
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              }`}
            >
              {simulationStats.isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  Stop Simulation
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Simulation
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Tourists"
            value={analytics.totalTourists}
            change="+8.2%"
            icon={Users}
            color="bg-blue-600"
            subtitle="Registered users"
          />
          <MetricCard
            title="Active Tracking"
            value={analytics.activeTourists}
            change="+12.5%"
            icon={MapPin}
            color="bg-emerald-600"
            subtitle="With GPS location"
          />
          <MetricCard
            title="SOS Alerts"
            value={analytics.sosAlerts}
            icon={AlertTriangle}
            color="bg-red-600"
            subtitle="Requiring attention"
          />
          <MetricCard
            title="IoT Simulations"
            value={simulationStats?.activeSimulations || 0}
            icon={Activity}
            color="bg-purple-600"
            subtitle={simulationStats?.isRunning ? "Running" : "Stopped"}
          />
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Area Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-gray-900">Tourist Distribution by Area</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={areaChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="area" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="safe" stackId="a" fill="#059669" name="Safe" />
              <Bar dataKey="sos" stackId="a" fill="#dc2626" name="SOS" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-gray-900">24-Hour Activity Pattern</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={hourlyActivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="activity"
                stackId="1"
                stroke="#059669"
                fill="#059669"
                fillOpacity={0.6}
                name="Activity"
              />
              <Area
                type="monotone"
                dataKey="alerts"
                stackId="1"
                stroke="#dc2626"
                fill="#dc2626"
                fillOpacity={0.8}
                name="Alerts"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      {analytics && analytics.recentActivity && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {analytics.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{activity.name}</p>
                    <p className="text-sm text-gray-500">
                      Location updated: {activity.latitude?.toFixed(4)}, {activity.longitude?.toFixed(4)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{new Date(activity.updatedAt).toLocaleTimeString()}</p>
                    {activity.sosActive && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-1">
                        SOS Active
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Simulation Status */}
      {simulationStats && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-gray-900">IoT Simulation Status</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600">{simulationStats.activeSimulations}</div>
              <div className="text-sm text-gray-500 mt-1">Active Simulations</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${simulationStats.isRunning ? "text-green-600" : "text-red-600"}`}>
                {simulationStats.isRunning ? "RUNNING" : "STOPPED"}
              </div>
              <div className="text-sm text-gray-500 mt-1">System Status</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">5s</div>
              <div className="text-sm text-gray-500 mt-1">Update Interval</div>
            </div>
          </div>

          {simulationStats.simulatedTourists && simulationStats.simulatedTourists.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-3">Simulated Tourists</h4>
              <div className="flex flex-wrap gap-2">
                {simulationStats.simulatedTourists.map((touristId) => (
                  <span
                    key={touristId}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800"
                  >
                    #{touristId}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AnalyticsDashboard
