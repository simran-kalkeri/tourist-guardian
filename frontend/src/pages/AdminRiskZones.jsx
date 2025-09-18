import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Alert, AlertDescription } from '../components/ui/alert'
import { RefreshCw, MapPin, AlertTriangle, Shield, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import RiskZoneMap from '../components/RiskZoneMap'

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
  const [isEditMode, setIsEditMode] = useState(false)
  const [newZone, setNewZone] = useState({
    name: '',
    description: '',
    risk_level: 'low',
    latitude: '',
    longitude: '',
    radius: '500',
    state: '',
    district: ''
  })
  
  const resetNewZoneForm = () => {
    setNewZone({
      name: '',
      description: '',
      risk_level: 'low',
      latitude: '',
      longitude: '',
      radius: '500',
      state: '',
      district: ''
    })
    setError(null)
  }

  const openEditForm = (zone) => {
    console.log('Opening edit form for zone:', zone.name)
    setSelectedZone(zone)
    setIsEditMode(true)
    
    // Populate the form with existing zone data
    setNewZone({
      name: zone.name || '',
      description: zone.description || '',
      risk_level: zone.risk_level || 'low',
      latitude: zone.latitude ? zone.latitude.toString() : '',
      longitude: zone.longitude ? zone.longitude.toString() : '',
      radius: zone.radius ? zone.radius.toString() : '500',
      state: zone.state || '',
      district: zone.district || ''
    })
    
    setShowCreateForm(true)
    setError(null)
  }

  const closeForm = () => {
    setShowCreateForm(false)
    setIsEditMode(false)
    setSelectedZone(null)
    resetNewZoneForm()
  }

  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'

  const fetchZones = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/geofencing/zones`)
      if (!response.ok) throw new Error('Failed to fetch zones')
      
      const data = await response.json()
      
      // Use real API data - all zones from the API should have coordinates
      const realZones = data.data || []
      
      console.log('Fetched zones from API:', realZones.length, 'zones')
      
      setZones(realZones)
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
        fetch(`${API_BASE}/api/geofencing/statistics`),
        fetch(`${API_BASE}/api/anomalies/stats`)
      ])
      
      if (zonesResponse.ok) {
        const zonesData = await zonesResponse.json()
        if (zonesData.success && zonesData.data) {
          setStats(prev => ({ 
            ...prev, 
            total: zonesData.data.totalZones || 0,
            active: zones.filter(z => z.alert_enabled).length || 0,
            highRiskZones: zonesData.data.highRiskZones || 0,
            moderateRiskZones: zonesData.data.moderateRiskZones || 0,
            lowRiskZones: zonesData.data.lowRiskZones || 0,
            activeAlerts: zonesData.data.activeAlerts || 0
          }))
        }
      }
      
      if (anomaliesResponse.ok) {
        const anomaliesData = await anomaliesResponse.json()
        setStats(prev => ({ ...prev, anomalies: anomaliesData.stats }))
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const toggleZoneStatus = async (zoneId, alertEnabled) => {
    try {
      const response = await fetch(`${API_BASE}/api/geofencing/zones/${zoneId}/toggle-alert`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        console.log('Zone status updated, refreshing map...')
        await refreshZones() // This will update both zones and stats
      }
    } catch (err) {
      console.error('Error toggling zone status:', err)
    }
  }

  const deleteZone = async (zoneId) => {
    if (!window.confirm('Are you sure you want to delete this zone?')) return
    
    try {
      const response = await fetch(`${API_BASE}/api/geofencing/zones/${zoneId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        console.log('Zone deleted, refreshing map...')
        await refreshZones() // This will update both zones and stats
      }
    } catch (err) {
      console.error('Error deleting zone:', err)
    }
  }

  const generateZoneId = () => {
    // Generate unique zone ID with format: NE + 3-digit number
    const existingIds = zones.map(zone => zone.zone_id).filter(id => id && id.startsWith('NE'))
    let newId
    let attempts = 0
    
    do {
      const randomNum = Math.floor(Math.random() * 900) + 100 // Generate 100-999
      newId = `NE${randomNum}`
      attempts++
    } while (existingIds.includes(newId) && attempts < 100)
    
    // Fallback to timestamp-based ID if we can't find a unique random one
    if (existingIds.includes(newId)) {
      newId = `NE${Date.now().toString().slice(-3)}`
    }
    
    return newId
  }

  const validateZoneForm = () => {
    if (!newZone.name.trim()) {
      setError('Zone name is required')
      return false
    }
    if (!newZone.latitude || !newZone.longitude) {
      setError('Latitude and longitude are required')
      return false
    }
    if (!newZone.description.trim()) {
      setError('Description is required')
      return false
    }
    
    // Validate coordinate ranges
    const lat = parseFloat(newZone.latitude)
    const lng = parseFloat(newZone.longitude)
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Latitude must be between -90 and 90')
      return false
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError('Longitude must be between -180 and 180')
      return false
    }
    
    const radius = parseInt(newZone.radius)
    if (isNaN(radius) || radius < 1 || radius > 50000) {
      setError('Radius must be between 1 and 50,000 meters')
      return false
    }
    
    return true
  }

  const createZone = async () => {
    if (!validateZoneForm()) return

    try {
      // Create simplified zone data that matches API requirements
      const zoneData = {
        zone_id: generateZoneId(),
        name: newZone.name.trim(),
        description: newZone.description.trim(),
        latitude: parseFloat(newZone.latitude),
        longitude: parseFloat(newZone.longitude),
        radius: parseInt(newZone.radius) || 500,
        zone_type: 'circle',
        risk_level: newZone.risk_level
      }
      
      // Add optional fields if provided
      if (newZone.state && newZone.state.trim()) {
        zoneData.state = newZone.state.trim()
      }
      if (newZone.district && newZone.district.trim()) {
        zoneData.district = newZone.district.trim()
      }

      console.log('Sending zone data:', zoneData)

      const response = await fetch(`${API_BASE}/api/geofencing/zones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // Removed Authorization header as it might not be required for zone creation
        },
        body: JSON.stringify(zoneData)
      })
      
      const responseData = await response.json()
      console.log('API Response:', response.status, responseData)
      
      if (response.ok) {
        console.log('Zone created successfully, refreshing map...')
        setShowCreateForm(false)
        resetNewZoneForm()
        await refreshZones() // This will update both zones and stats
        
        // Show success message (you could add a success state if needed)
        console.log('Zone created:', responseData.data?.name, 'with ID:', responseData.data?.zone_id)
      } else {
        let errorMsg = 'Failed to create zone'
        
        if (response.status === 409) {
          errorMsg = 'A zone with this ID already exists. Please try again.'
        } else if (response.status === 400) {
          errorMsg = responseData.error || responseData.message || 'Invalid zone data provided'
        } else if (response.status === 500) {
          errorMsg = 'Server error. Please check your data and try again.'
        } else {
          errorMsg = responseData.error || responseData.message || `Server returned ${response.status}`
        }
        
        console.error('Zone creation failed:', response.status, errorMsg)
        setError(errorMsg)
      }
    } catch (err) {
      console.error('Error creating zone:', err)
      setError(`Network error: ${err.message}`)
    }
  }

  const updateZone = async () => {
    if (!validateZoneForm()) return
    
    if (!selectedZone || !selectedZone._id) {
      setError('No zone selected for editing')
      return
    }

    try {
      // Create simplified zone data for update
      const zoneData = {
        name: newZone.name.trim(),
        description: newZone.description.trim(),
        latitude: parseFloat(newZone.latitude),
        longitude: parseFloat(newZone.longitude),
        radius: parseInt(newZone.radius) || 500,
        zone_type: 'circle',
        risk_level: newZone.risk_level
      }
      
      // Add optional fields if provided
      if (newZone.state && newZone.state.trim()) {
        zoneData.state = newZone.state.trim()
      }
      if (newZone.district && newZone.district.trim()) {
        zoneData.district = newZone.district.trim()
      }

      console.log('Updating zone:', selectedZone._id, 'with data:', zoneData)

      const response = await fetch(`${API_BASE}/api/geofencing/zones/${selectedZone._id}`, {
        method: 'PUT', // or PATCH depending on your API
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(zoneData)
      })
      
      const responseData = await response.json()
      console.log('Update API Response:', response.status, responseData)
      
      if (response.ok) {
        console.log('Zone updated successfully, refreshing map...')
        closeForm()
        await refreshZones() // This will update both zones and stats
        
        // Show success message
        console.log('Zone updated:', responseData.data?.name || newZone.name)
      } else {
        let errorMsg = 'Failed to update zone'
        
        if (response.status === 404) {
          errorMsg = 'Zone not found. It may have been deleted by another user.'
        } else if (response.status === 400) {
          errorMsg = responseData.error || responseData.message || 'Invalid zone data provided'
        } else if (response.status === 500) {
          errorMsg = 'Server error. Please check your data and try again.'
        } else {
          errorMsg = responseData.error || responseData.message || `Server returned ${response.status}`
        }
        
        console.error('Zone update failed:', response.status, errorMsg)
        setError(errorMsg)
      }
    } catch (err) {
      console.error('Error updating zone:', err)
      setError(`Network error: ${err.message}`)
    }
  }

  const getZoneTypeBadge = (riskLevel) => {
    if (!riskLevel) return <Badge className="bg-gray-100 text-gray-800">📍 UNKNOWN</Badge>
    
    const types = {
      high: { color: 'bg-red-100 text-red-800', icon: '🚨' },
      moderate: { color: 'bg-orange-100 text-orange-800', icon: '⚠️' },
      low: { color: 'bg-green-100 text-green-800', icon: '✅' }
    }
    const type = types[riskLevel] || { color: 'bg-gray-100 text-gray-800', icon: '📍' }
    
    return (
      <Badge className={type.color}>
        <span className="mr-1">{type.icon}</span>
        {riskLevel.toUpperCase()}
      </Badge>
    )
  }

  const getSeverityBadge = (riskLevel) => {
    if (!riskLevel) return <Badge className="bg-gray-100 text-gray-800">⚪ UNKNOWN</Badge>
    
    const severities = {
      low: { color: 'bg-green-100 text-green-800', icon: '🟢' },
      moderate: { color: 'bg-yellow-100 text-yellow-800', icon: '🟡' },
      high: { color: 'bg-red-100 text-red-800', icon: '🔴' }
    }
    const sev = severities[riskLevel] || { color: 'bg-gray-100 text-gray-800', icon: '⚪' }
    
    return (
      <Badge className={sev.color}>
        <span className="mr-1">{sev.icon}</span>
        {riskLevel.toUpperCase()}
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
    const matchesFilter = filter === 'all' || zone.risk_level === filter
    const matchesSearch = searchTerm === '' || 
      zone.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      zone.description?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const recentAnomalies = anomalies.slice(0, 10)

  // Refresh function that can be called from child components
  const refreshZones = async () => {
    await fetchZones()
    await fetchStats()
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchZones(), fetchAnomalies(), fetchStats()])
      setLoading(false)
    }
    
    loadData()
    const interval = setInterval(() => {
      // Refresh without showing loading state for background updates
      Promise.all([fetchZones(), fetchAnomalies(), fetchStats()])
    }, 30000) // Poll every 30 seconds
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
          <Button onClick={() => {
            setIsEditMode(false)
            setSelectedZone(null)
            resetNewZoneForm()
            setShowCreateForm(true)
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Zone
          </Button>
          <Button onClick={() => { refreshZones(); fetchAnomalies(); }} disabled={loading}>
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
            <div className="text-2xl font-bold">{stats.total || zones.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {zones.filter(z => z.alert_enabled).length || 0} active
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
              {stats.highRiskZones || zones.filter(z => z.risk_level === 'high').length || 0}
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

      {/* Risk Zones Map */}
      <RiskZoneMap 
        zones={zones}
        loading={loading}
        onZoneSelect={setSelectedZone}
        onRefresh={refreshZones}
      />

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
            <SelectValue placeholder="Filter by risk level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            <SelectItem value="high">High Risk</SelectItem>
            <SelectItem value="moderate">Moderate Risk</SelectItem>
            <SelectItem value="low">Low Risk</SelectItem>
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
                    <th className="text-left p-2">Risk Level</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-left p-2">Created</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredZones.map((zone) => (
                    <tr key={zone._id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-2 font-medium">{zone.name || 'Unnamed Zone'}</td>
                      <td className="p-2">{getSeverityBadge(zone.risk_level)}</td>
                      <td className="p-2">
                        <div className="flex items-center space-x-2">
                          {zone.alert_enabled ? (
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
                        {formatDate(zone.last_updated)}
                      </td>
                      <td className="p-2">
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditForm(zone)}
                            title="Edit zone"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleZoneStatus(zone._id, zone.alert_enabled)}
                          >
                            {zone.alert_enabled ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
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
      
      {/* Simple Zone Creation Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>
                {isEditMode ? `Edit Zone: ${selectedZone?.name || 'Unknown'}` : 'Add New Risk Zone'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Zone Name</label>
                <Input
                  value={newZone.name}
                  onChange={(e) => setNewZone({...newZone, name: e.target.value})}
                  placeholder="Enter zone name"
                />
                {isEditMode ? (
                  <p className="text-xs text-gray-500 mt-1">
                    Zone ID: <span className="font-mono font-medium">{selectedZone?.zone_id || 'Unknown'}</span>
                  </p>
                ) : (
                  newZone.name && (
                    <p className="text-xs text-gray-500 mt-1">
                      Zone ID will be: <span className="font-mono font-medium">{generateZoneId()}</span>
                    </p>
                  )
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Input
                  value={newZone.description}
                  onChange={(e) => setNewZone({...newZone, description: e.target.value})}
                  placeholder="Enter zone description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Risk Level</label>
                <Select value={newZone.risk_level} onValueChange={(value) => setNewZone({...newZone, risk_level: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="moderate">Moderate Risk</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Latitude</label>
                  <Input
                    value={newZone.latitude}
                    onChange={(e) => setNewZone({...newZone, latitude: e.target.value})}
                    placeholder="26.1445 (Guwahati)"
                    type="number"
                    step="any"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {isEditMode ? (
                      parseFloat(newZone.latitude) !== selectedZone?.latitude ? (
                        <span className="text-orange-600 font-medium">⚠️ Coordinates will be updated</span>
                      ) : (
                        <span className="text-gray-400">Current coordinate</span>
                      )
                    ) : (
                      'Examples: 26.1445 (Guwahati), 25.5788 (Shillong)'
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Longitude</label>
                  <Input
                    value={newZone.longitude}
                    onChange={(e) => setNewZone({...newZone, longitude: e.target.value})}
                    placeholder="91.7362 (Guwahati)"
                    type="number"
                    step="any"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {isEditMode ? (
                      parseFloat(newZone.longitude) !== selectedZone?.longitude ? (
                        <span className="text-orange-600 font-medium">⚠️ Coordinates will be updated</span>
                      ) : (
                        <span className="text-gray-400">Current coordinate</span>
                      )
                    ) : (
                      'Examples: 91.7362 (Guwahati), 91.8933 (Shillong)'
                    )}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Radius (meters)</label>
                <Input
                  value={newZone.radius}
                  onChange={(e) => setNewZone({...newZone, radius: e.target.value})}
                  placeholder="500"
                  type="number"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">State</label>
                  <Input
                    value={newZone.state}
                    onChange={(e) => setNewZone({...newZone, state: e.target.value})}
                    placeholder="e.g., Assam"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">District</label>
                  <Input
                    value={newZone.district}
                    onChange={(e) => setNewZone({...newZone, district: e.target.value})}
                    placeholder="e.g., Kamrup"
                  />
                </div>
              </div>
              <div className="flex space-x-2 pt-4">
                <Button 
                  onClick={isEditMode ? updateZone : createZone} 
                  className="flex-1"
                  disabled={!newZone.name.trim() || !newZone.description.trim() || !newZone.latitude || !newZone.longitude}
                >
                  {isEditMode ? 'Update Zone' : 'Create Zone'}
                </Button>
                <Button 
                  onClick={closeForm}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default AdminRiskZones






