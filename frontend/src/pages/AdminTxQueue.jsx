import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Alert, AlertDescription } from '../components/ui/alert'
import { RefreshCw, FileText, Clock, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react'

const AdminTxQueue = () => {
  const [jobs, setJobs] = useState([])
  const [status, setStatus] = useState({ total: 0, pending: 0, sent: 0, failed: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://10.1.1.0:5000'

  const fetchTxQueueStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/tx-queue/status`)
      if (!response.ok) throw new Error('Failed to fetch TX queue status')
      
      const data = await response.json()
      setJobs(data.status.jobs || [])
      setStatus({
        total: data.status.total || 0,
        pending: data.status.pending || 0,
        sent: data.status.sent || 0,
        failed: data.status.failed || 0
      })
      setError(null)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching TX queue status:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'sent':
        return <Badge variant="success" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>
      case 'failed':
        return <Badge variant="destructive" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTxTypeIcon = (txType) => {
    switch (txType) {
      case 'registration':
        return <FileText className="w-4 h-4 text-blue-600" />
      case 'sos':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'efir':
        return <FileText className="w-4 h-4 text-orange-600" />
      case 'tour_end':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      default:
        return <FileText className="w-4 h-4 text-gray-600" />
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const formatTxHash = (txHash) => {
    if (!txHash) return 'N/A'
    return `${txHash.slice(0, 6)}...${txHash.slice(-4)}`
  }

  const openTxInExplorer = (txHash) => {
    if (!txHash) return
    // For Ganache, we could open in a local explorer or just show the full hash
    window.open(`https://etherscan.io/tx/${txHash}`, '_blank')
  }

  const filteredJobs = jobs.filter(job => {
    const matchesFilter = filter === 'all' || job.status === filter
    const matchesSearch = searchTerm === '' || 
      job.touristId.toString().includes(searchTerm) ||
      job.txType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.txHash && job.txHash.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesFilter && matchesSearch
  })

  useEffect(() => {
    fetchTxQueueStatus()
    const interval = setInterval(fetchTxQueueStatus, 15000) // Poll every 15 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading TX queue status...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transaction Queue Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Monitor blockchain transaction processing and retry logic</p>
        </div>
        <Button onClick={fetchTxQueueStatus} disabled={loading}>
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
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{status.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{status.sent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{status.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by tourist ID, type, or TX hash..."
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
            <SelectItem value="all">All Jobs</SelectItem>
            <SelectItem value="pending">Pending Only</SelectItem>
            <SelectItem value="sent">Sent Only</SelectItem>
            <SelectItem value="failed">Failed Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {jobs.length === 0 ? 'No transaction jobs found' : 'No jobs match your filters'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Tourist ID</th>
                    <th className="text-left p-2">Wallet Index</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Attempts</th>
                    <th className="text-left p-2">TX Hash</th>
                    <th className="text-left p-2">Created At</th>
                    <th className="text-left p-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => (
                    <tr key={job.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-2">
                        <div className="flex items-center space-x-2">
                          {getTxTypeIcon(job.txType)}
                          <span className="font-medium capitalize">{job.txType}</span>
                        </div>
                      </td>
                      <td className="p-2 font-mono text-sm">{job.touristId}</td>
                      <td className="p-2 font-mono text-sm">{job.walletIndex}</td>
                      <td className="p-2">{getStatusBadge(job.status)}</td>
                      <td className="p-2">
                        <div className="flex items-center space-x-1">
                          <span className="text-sm">{job.attempts}</span>
                          {job.attempts > 0 && (
                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        {job.txHash ? (
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                              {formatTxHash(job.txHash)}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openTxInExplorer(job.txHash)}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-2 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(job.createdAt)}
                      </td>
                      <td className="p-2">
                        {job.lastError ? (
                          <div className="max-w-xs">
                            <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                              {job.lastError.length > 50 
                                ? `${job.lastError.slice(0, 50)}...` 
                                : job.lastError
                              }
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
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

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Status Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                <Clock className="w-3 h-3 mr-1" />Pending
              </Badge>
              <span>Waiting to be processed</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="success" className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />Sent
              </Badge>
              <span>Successfully sent to blockchain</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="destructive" className="bg-red-100 text-red-800">
                <XCircle className="w-3 h-3 mr-1" />Failed
              </Badge>
              <span>Failed after max retries</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span>Currently retrying</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminTxQueue







