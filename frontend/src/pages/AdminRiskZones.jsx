import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Alert, AlertDescription } from '../components/ui/alert'
import { RefreshCw, MapPin, AlertTriangle, Shield, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react'

const AdminRiskZones = () => {
  const [zones, setZones] = useState([])
  const [anomalies, setAnomalies] = useState([])
  const [stats, setStats] = useState({ total: 0, active: 0, byType: [], bySeverity: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedZone, setSelectedZone] = useState(null)

  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://10.1.1.0:5000'

  const fetchZones = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/geofence/zones`)
      if (!response.ok) throw new Error('Failed to fetch zones')
      
      const data = await response.json()
      setZones(data.zones || [])
      setError(null)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching zones:', err)
    }
  }

  const fetchAnomalies = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/anomalies`)
      if (!response.ok) throw new Error('Failed to fetch anomalies')
      
      const data = await response.json()
      setAnomalies(data.anomalies || [])
    } catch (err) {
      console.error('Error fetching anomalies:', err)
    }
  }

  const fetchStats = async () => {
    try {
      const [zonesResponse, anomaliesResponse] = await Promise.all([
        fetch(`${API_BASE}/api/geofence/stats`),
        fetch(`${API_BASE}/api/anomalies/stats`)
      ])
      
      if (zonesResponse.ok) {
        const zonesData = await zonesResponse.json()
        setStats(prev => ({ ...prev, ...zonesData.stats }))
      }
      
      if (anomaliesResponse.ok) {
        const anomaliesData = await anomaliesResponse.json()
        setStats(prev => ({ ...prev, anomalies: anomaliesData.stats }))
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const toggleZoneStatus = async (zoneId, isActive) => {
    try {
      const response = await fetch(`${API_BASE}/api/geofence/zones/${zoneId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isActive: !isActive })
      })
      
      if (response.ok) {
        await fetchZones()
        await fetchStats()
      }
    } catch (err) {
      console.error('Error toggling zone status:', err)
    }
  }

  const deleteZone = async (zoneId) => {
    if (!window.confirm('Are you sure you want to delete this zone?')) return
    
    try {
      const response = await fetch(`${API_BASE}/api/geofence/zones/${zoneId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        await fetchZones()
        await fetchStats()
      }
    } catch (err) {
      console.error('Error deleting zone:', err)
    }
  }

  const getZoneTypeBadge = (zoneType) => {
    const types = {
      high_risk: { color: 'bg-red-100 text-red-800', icon: '🚨' },
      restricted: { color: 'bg-orange-100 text-orange-800', icon: '⚠️' },
      monitoring: { color: 'bg-yellow-100 text-yellow-800', icon: '👁️' },
      safe_zone: { color: 'bg-green-100 text-green-800', icon: '✅' }
    }
    const type = types[zoneType] || { color: 'bg-gray-100 text-gray-800', icon: '📍' }
    
    return (
      <Badge className={type.color}>
        <span className="mr-1">{type.icon}</span>
        {zoneType.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const getSeverityBadge = (severity) => {
    const severities = {
      low: { color: 'bg-green-100 text-green-800', icon: '🟢' },
      medium: { color: 'bg-yellow-100 text-yellow-800', icon: '🟡' },
      high: { color: 'bg-orange-100 text-orange-800', icon: '🟠' },
      critical: { color: 'bg-red-100 text-red-800', icon: '🔴' }
    }
    const sev = severities[severity] || { color: 'bg-gray-100 text-gray-800', icon: '⚪' }
    
    return (
      <Badge className={sev.color}>
        <span className="mr-1">{sev.icon}</span>
        {severity.toUpperCase()}
      </Badge>
    )
  }

  const getAnomalyTypeBadge = (anomalyType) => {
    const types = {
      gps_dropout: { color: 'bg-red-100 text-red-800', icon: '📡' },
      long_inactivity: { color: 'bg-orange-100 text-orange-800', icon: '⏰' },
      route_deviation: { color: 'bg-yellow-100 text-yellow-800', icon: '🛣️' },
      speed_anomaly: { color: 'bg-purple-100 text-purple-800', icon: '🏃' },
      location_anomaly: { color: 'bg-pink-100 text-pink-800', icon: '📍' }
    }
    const type = types[anomalyType] || { color: 'bg-gray-100 text-gray-800', icon: '❓' }
    
    return (
      <Badge className={type.color}>
        <span className="mr-1">{type.icon}</span>
        {anomalyType.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const filteredZones = zones.filter(zone => {
    const matchesFilter = filter === 'all' || zone.zoneType === filter
    const matchesSearch = searchTerm === '' || 
      zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      zone.description?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const recentAnomalies = anomalies.slice(0, 10)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchZones(), fetchAnomalies(), fetchStats()])
      setLoading(false)
    }
    
    loadData()
    const interval = setInterval(loadData, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading risk zones...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Risk Zones & Anomaly Detection</h1>
          <p className="text-gray-600 dark:text-gray-400">Monitor geo-fenced zones and AI-detected anomalies</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Zone
          </Button>
          <Button onClick={() => { fetchZones(); fetchAnomalies(); fetchStats(); }} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Zones</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Zones</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.byType?.find(t => t._id === 'high_risk')?.count || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Anomalies</CardTitle>
            <Shield className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {anomalies.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {anomalies.filter(a => a.severity === 'critical').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Anomalies */}
      {recentAnomalies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Recent Anomalies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAnomalies.map((anomaly) => (
                <div key={anomaly._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getAnomalyTypeBadge(anomaly.anomalyType)}
                    {getSeverityBadge(anomaly.severity)}
                    <div>
                      <p className="font-medium">Tourist #{anomaly.touristId}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {anomaly.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(anomaly.createdAt)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Confidence: {(anomaly.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search zones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            <SelectItem value="high_risk">High Risk</SelectItem>
            <SelectItem value="restricted">Restricted</SelectItem>
            <SelectItem value="monitoring">Monitoring</SelectItem>
            <SelectItem value="safe_zone">Safe Zone</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Zones Table */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Zones</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredZones.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {zones.length === 0 ? 'No risk zones found' : 'No zones match your filters'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Severity</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-left p-2">Created</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredZones.map((zone) => (
                    <tr key={zone._id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-2 font-medium">{zone.name}</td>
                      <td className="p-2">{getZoneTypeBadge(zone.zoneType)}</td>
                      <td className="p-2">{getSeverityBadge(zone.severity)}</td>
                      <td className="p-2">
                        <div className="flex items-center space-x-2">
                          {zone.isActive ? (
                            <Badge className="bg-green-100 text-green-800">
                              <Eye className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">
                              <EyeOff className="w-3 h-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {zone.description || 'No description'}
                      </td>
                      <td className="p-2 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(zone.createdAt)}
                      </td>
                      <td className="p-2">
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedZone(zone)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleZoneStatus(zone._id, zone.isActive)}
                          >
                            {zone.isActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteZone(zone._id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminRiskZones






