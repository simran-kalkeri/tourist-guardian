import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Alert, AlertDescription } from '../components/ui/alert'
import { RefreshCw, Wallet, Users, Clock, CheckCircle, XCircle } from 'lucide-react'

const AdminWalletPool = () => {
  const [wallets, setWallets] = useState([])
  const [status, setStatus] = useState({ total: 0, available: 0, assigned: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [releasing, setReleasing] = useState(new Set())

  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://10.1.1.0:5000'

  const fetchWalletPoolStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/wallet-pool/status`)
      if (!response.ok) throw new Error('Failed to fetch wallet pool status')
      
      const data = await response.json()
      setWallets(data.status.assignedWallets || [])
      setStatus({
        total: data.status.total || 0,
        available: data.status.available || 0,
        assigned: data.status.assigned || 0
      })
      setError(null)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching wallet pool status:', err)
    } finally {
      setLoading(false)
    }
  }

  const releaseWallet = async (index) => {
    setReleasing(prev => new Set(prev).add(index))
    try {
      const response = await fetch(`${API_BASE}/api/admin/wallet-pool/${index}/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to release wallet')
      }
      
      const data = await response.json()
      console.log('Wallet released:', data)
      
      // Refresh data
      await fetchWalletPoolStatus()
    } catch (err) {
      setError(err.message)
      console.error('Error releasing wallet:', err)
    } finally {
      setReleasing(prev => {
        const newSet = new Set(prev)
        newSet.delete(index)
        return newSet
      })
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return <Badge variant="success" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Available</Badge>
      case 'assigned':
        return <Badge variant="destructive" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Assigned</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const filteredWallets = wallets.filter(wallet => {
    const matchesFilter = filter === 'all' || wallet.status === filter
    const matchesSearch = searchTerm === '' || 
      wallet.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wallet.assignedToTouristId?.toString().includes(searchTerm)
    return matchesFilter && matchesSearch
  })

  useEffect(() => {
    fetchWalletPoolStatus()
    const interval = setInterval(fetchWalletPoolStatus, 15000) // Poll every 15 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading wallet pool status...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Wallet Pool Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Monitor and manage Ganache wallet assignments</p>
        </div>
        <Button onClick={fetchWalletPoolStatus} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Wallets</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{status.available}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <Users className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{status.assigned}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status.total > 0 ? Math.round((status.assigned / status.total) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by address or tourist ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Wallets</SelectItem>
            <SelectItem value="available">Available Only</SelectItem>
            <SelectItem value="assigned">Assigned Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Wallets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Wallet Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredWallets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {wallets.length === 0 ? 'No wallets found' : 'No wallets match your filters'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Index</th>
                    <th className="text-left p-2">Address</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Tourist ID</th>
                    <th className="text-left p-2">Assigned At</th>
                    <th className="text-left p-2">Expires At</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWallets.map((wallet) => (
                    <tr key={wallet.index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-2 font-mono text-sm">{wallet.index}</td>
                      <td className="p-2 font-mono text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                        </span>
                      </td>
                      <td className="p-2">{getStatusBadge(wallet.status)}</td>
                      <td className="p-2">
                        {wallet.assignedToTouristId ? (
                          <span className="font-mono text-sm">{wallet.assignedToTouristId}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-2 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(wallet.assignedAt)}
                      </td>
                      <td className="p-2 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(wallet.expiresAt)}
                      </td>
                      <td className="p-2">
                        {wallet.status === 'assigned' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => releaseWallet(wallet.index)}
                            disabled={releasing.has(wallet.index)}
                          >
                            {releasing.has(wallet.index) ? (
                              <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <XCircle className="w-3 h-3 mr-1" />
                            )}
                            Release
                          </Button>
                        )}
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

export default AdminWalletPool







