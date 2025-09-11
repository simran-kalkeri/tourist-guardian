"use client"

import { useState, useEffect } from "react"
import { Mic, MicOff, AlertTriangle, Phone } from "lucide-react"

const VoiceSOS = ({ touristId, onSOSTriggered }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [recognition, setRecognition] = useState(null)
  const [transcript, setTranscript] = useState("")
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Check for speech recognition support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognitionInstance = new SpeechRecognition()
      
      recognitionInstance.continuous = true
      recognitionInstance.interimResults = true
      recognitionInstance.lang = 'en-US'

      recognitionInstance.onstart = () => {
        setIsRecording(true)
        setTranscript("")
      }

      recognitionInstance.onresult = (event) => {
        let finalTranscript = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        setTranscript(finalTranscript)
        
        // Check for SOS keywords
        const sosKeywords = ['help', 'emergency', 'sos', 'danger', 'police', 'ambulance']
        const lowerTranscript = finalTranscript.toLowerCase()
        if (sosKeywords.some(keyword => lowerTranscript.includes(keyword))) {
          triggerSOS()
        }
      }

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsRecording(false)
      }

      recognitionInstance.onend = () => {
        setIsRecording(false)
      }

      setRecognition(recognitionInstance)
      setIsSupported(true)
    }
  }, [])

  const startRecording = () => {
    if (recognition && !isRecording) {
      recognition.start()
    }
  }

  const stopRecording = () => {
    if (recognition && isRecording) {
      recognition.stop()
    }
  }

  const triggerSOS = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/tourists/${touristId}/sos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          voiceTranscript: transcript,
          triggeredBy: 'voice_recognition'
        })
      })
      
      const result = await response.json()
      if (result.success) {
        onSOSTriggered && onSOSTriggered()
        alert("SOS Alert triggered via voice recognition!")
      }
    } catch (error) {
      console.error("Failed to trigger SOS:", error)
      alert("Failed to trigger SOS. Please try again.")
    }
  }

  const manualSOS = () => {
    triggerSOS()
  }

  if (!isSupported) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Voice SOS not supported</span>
        </div>
        <p className="text-sm text-red-600 mt-1">
          Your browser doesn't support speech recognition. Use the manual SOS button instead.
        </p>
        <button
          onClick={manualSOS}
          className="mt-3 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <Phone className="w-4 h-4" />
          Manual SOS
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Voice SOS</h3>
        <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
      </div>

      <div className="space-y-4">
        <div className="text-center">
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="bg-red-600 text-white p-4 rounded-full hover:bg-red-700 transition-colors"
            >
              <MicOff className="w-8 h-8" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="bg-emerald-600 text-white p-4 rounded-full hover:bg-emerald-700 transition-colors"
            >
              <Mic className="w-8 h-8" />
            </button>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            {isRecording ? "Listening for SOS keywords..." : "Click to start voice recognition"}
          </p>
          <p className="text-xs text-gray-500">
            Say: "help", "emergency", "SOS", "danger", "police", or "ambulance"
          </p>
        </div>

        {transcript && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Transcript:</span> {transcript}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={manualSOS}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4" />
            Manual SOS
          </button>
        </div>
      </div>
    </div>
  )
}

export default VoiceSOS
