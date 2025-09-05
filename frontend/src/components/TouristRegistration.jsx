"use client"

import { useState } from "react"
import { Shield, User, Calendar, Phone, MapPin, AlertCircle, CheckCircle } from "lucide-react"

const TouristRegistration = () => {
  const [formData, setFormData] = useState({
    name: "",
    aadharOrPassport: "",
    tripStart: "",
    tripEnd: "",
    emergencyContact: "",
  })

  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [registrationResult, setRegistrationResult] = useState(null)

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required"
    }

    if (!formData.aadharOrPassport.trim()) {
      newErrors.aadharOrPassport = "Aadhaar or Passport number is required"
    } else if (formData.aadharOrPassport.length < 8) {
      newErrors.aadharOrPassport = "Invalid document number"
    }

    if (!formData.tripStart) {
      newErrors.tripStart = "Trip start date is required"
    }

    if (!formData.tripEnd) {
      newErrors.tripEnd = "Trip end date is required"
    } else if (new Date(formData.tripEnd) <= new Date(formData.tripStart)) {
      newErrors.tripEnd = "End date must be after start date"
    }

    if (!formData.emergencyContact.trim()) {
      newErrors.emergencyContact = "Emergency contact is required"
    } else if (!/^\+?[\d\s-()]+$/.test(formData.emergencyContact)) {
      newErrors.emergencyContact = "Invalid phone number format"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const response = await fetch("http://localhost:5000/api/tourists/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(true)
        setRegistrationResult(result.tourist)
        setFormData({
          name: "",
          aadharOrPassport: "",
          tripStart: "",
          tripEnd: "",
          emergencyContact: "",
        })
      } else {
        setErrors({ submit: result.error || "Registration failed" })
      }
    } catch (error) {
      setErrors({ submit: "Network error. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
          <p className="text-gray-600 mb-4">Your tourist safety ID has been generated</p>

          {registrationResult && (
            <div className="bg-orange-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">Tourist ID</p>
              <p className="text-2xl font-bold text-orange-600">#{registrationResult.id}</p>
              <p className="text-sm text-gray-500 mt-2">Keep this ID safe for your trip</p>
            </div>
          )}

          <button
            onClick={() => {
              setSuccess(false)
              setRegistrationResult(null)
            }}
            className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 transition-colors"
          >
            Register Another Tourist
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl w-full">
        {/* Header */}
        <div className="bg-orange-600 text-white p-6">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Tourist Safety Registration</h1>
              <p className="text-orange-100">Secure your journey with our monitoring system</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Personal Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-orange-600" />
                  Personal Information
                </h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                        errors.name ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                      placeholder="Enter your full name"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="aadharOrPassport" className="block text-sm font-medium text-gray-700 mb-2">
                      Aadhaar / Passport Number *
                    </label>
                    <input
                      type="text"
                      id="aadharOrPassport"
                      name="aadharOrPassport"
                      value={formData.aadharOrPassport}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                        errors.aadharOrPassport ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                      placeholder="Enter document number"
                    />
                    {errors.aadharOrPassport && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.aadharOrPassport}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-orange-600" />
                  Emergency Contact
                </h3>

                <div>
                  <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="emergencyContact"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                      errors.emergencyContact ? "border-red-500 bg-red-50" : "border-gray-300"
                    }`}
                    placeholder="+91 9876543210"
                  />
                  {errors.emergencyContact && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.emergencyContact}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Travel Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  Travel Details
                </h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="tripStart" className="block text-sm font-medium text-gray-700 mb-2">
                      Trip Start Date *
                    </label>
                    <input
                      type="date"
                      id="tripStart"
                      name="tripStart"
                      value={formData.tripStart}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split("T")[0]}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                        errors.tripStart ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                    />
                    {errors.tripStart && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.tripStart}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="tripEnd" className="block text-sm font-medium text-gray-700 mb-2">
                      Trip End Date *
                    </label>
                    <input
                      type="date"
                      id="tripEnd"
                      name="tripEnd"
                      value={formData.tripEnd}
                      onChange={handleInputChange}
                      min={formData.tripStart || new Date().toISOString().split("T")[0]}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                        errors.tripEnd ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                    />
                    {errors.tripEnd && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.tripEnd}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Safety Information */}
              <div className="bg-orange-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-600" />
                  Safety Features
                </h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                    Real-time location tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                    Emergency SOS alerts
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                    24/7 monitoring support
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                    Blockchain-secured identity
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            {errors.submit && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  {errors.submit}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-orange-700 focus:ring-4 focus:ring-orange-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Registering...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Register for Safety Monitoring
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-500 mt-4">
              By registering, you agree to location tracking for safety purposes
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TouristRegistration
