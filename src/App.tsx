import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Copy, History, Trash2, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import BackgroundRotator from '@/components/BackgroundRotator'

interface TranscriptionEntry {
  id: string
  text: string
  timestamp: Date
  duration: number
}

function App() {
  const [isRecording, setIsRecording] = useState(false)
  const [currentTranscription, setCurrentTranscription] = useState('')
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionEntry[]>([])
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number>()
  const recordingStartRef = useRef<number>(0)
  const recordingIntervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      
      // Set up audio level monitoring
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        setAudioLevel(average)
        if (isRecording) {
          animationRef.current = requestAnimationFrame(updateAudioLevel)
        }
      }
      updateAudioLevel()
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }
      
      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm'
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        if (audioBlob.size === 0) {
          console.error('Recorded audio blob is empty')
          toast.error('Recording failed. Please try again.')
          return
        }
        await transcribeAudio(audioBlob)
        audioContext.close()
      }
      
      mediaRecorder.start()
      setIsRecording(true)
      recordingStartRef.current = Date.now()
      
      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - recordingStartRef.current) / 1000))
      }, 1000)
      
      toast.success('Recording started!')
    } catch (error) {
      console.error('Error starting recording:', error)
      toast.error('Failed to start recording. Please check microphone permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
    }
    
    setIsRecording(false)
    setAudioLevel(0)
    setRecordingTime(0)
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const dataUrl = reader.result as string
          // dataUrl format: "data:audio/webm;base64,<base64>"
          const base64String = dataUrl.split(',')[1] || ''
          resolve(base64String)
        }
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(audioBlob)
      })
      
      // Call the deployed edge function
      const response = await fetch('https://ansz84vj--whisper-transcribe.functions.blink.new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audio: base64, language: 'en' }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Transcription failed')
      }

      const result = await response.json()
      
      const transcriptionEntry: TranscriptionEntry = {
        id: Date.now().toString(),
        text: result.text,
        timestamp: new Date(),
        duration: Math.floor((Date.now() - recordingStartRef.current) / 1000)
      }
      
      setCurrentTranscription(result.text)
      setTranscriptionHistory(prev => [transcriptionEntry, ...prev])
      toast.success('Transcription completed!')
      setIsTranscribing(false)
    } catch (error) {
      console.error('Error transcribing audio:', error)
      toast.error(`Failed to transcribe audio: ${error.message || 'Please try again.'}`)
      setIsTranscribing(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Text copied to clipboard!')
  }

  const clearHistory = () => {
    setTranscriptionHistory([])
    setCurrentTranscription('')
    toast.success('History cleared!')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString()
  }

  return (
    <div className="min-h-screen relative">
      <BackgroundRotator />
      <div className="relative z-10 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="flex items-center justify-center gap-3">
              <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shadow-lg">
                <Volume2 className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white drop-shadow-lg">
                Voice to Text AI
              </h1>
            </div>
            <p className="text-white/90 max-w-md mx-auto drop-shadow-md">
              Speak naturally and watch your words transform into text instantly with AI-powered transcription.
            </p>
          </motion.div>

          {/* Main Recording Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-md">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-xl text-gray-800">
                  {isRecording ? 'Recording...' : isTranscribing ? 'Transcribing...' : 'Ready to Record'}
                </CardTitle>
                <CardDescription>
                  {isRecording && `Recording time: ${formatTime(recordingTime)}`}
                  {isTranscribing && 'Processing your audio...'}
                  {!isRecording && !isTranscribing && 'Click the microphone to start recording'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Recording Button */}
                <div className="flex justify-center">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isTranscribing}
                      size="lg"
                      className={`relative h-20 w-20 rounded-full p-0 transition-all duration-300 ${
                        isRecording 
                          ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                          : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700'
                      }`}
                    >
                      {isRecording ? (
                        <MicOff className="h-8 w-8 text-white" />
                      ) : (
                        <Mic className="h-8 w-8 text-white" />
                      )}
                      
                      {/* Audio level indicator */}
                      {isRecording && (
                        <motion.div
                          className="absolute inset-0 rounded-full border-4 border-white/30"
                          animate={{
                            scale: 1 + (audioLevel / 255) * 0.3,
                            opacity: 0.6 + (audioLevel / 255) * 0.4
                          }}
                          transition={{ duration: 0.1 }}
                        />
                      )}
                    </Button>
                  </motion.div>
                </div>

                {/* Current Transcription */}
                <AnimatePresence>
                  {currentTranscription && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-4"
                    >
                      <Separator />
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-700">Latest Transcription</h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(currentTranscription)}
                            className="gap-2"
                          >
                            <Copy className="h-4 w-4" />
                            Copy
                          </Button>
                        </div>
                        <Card className="bg-gray-50/50 border-gray-200">
                          <CardContent className="p-4">
                            <p className="text-gray-800 leading-relaxed">{currentTranscription}</p>
                          </CardContent>
                        </Card>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* History Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-gray-600" />
                    <CardTitle className="text-lg">Transcription History</CardTitle>
                    <Badge variant="secondary" className="ml-2">
                      {transcriptionHistory.length}
                    </Badge>
                  </div>
                  {transcriptionHistory.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearHistory}
                      className="gap-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    <AnimatePresence>
                      {transcriptionHistory.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-center py-8 text-gray-500"
                        >
                          <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p>No transcriptions yet</p>
                          <p className="text-sm">Start recording to see your transcription history</p>
                        </motion.div>
                      ) : (
                        transcriptionHistory.map((entry, index) => (
                          <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <Card className="bg-gray-50/50 border-gray-200 hover:shadow-md transition-shadow">
                              <CardContent className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <p className="text-gray-800 leading-relaxed">{entry.text}</p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(entry.text)}
                                    className="shrink-0"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span>{formatTimestamp(entry.timestamp)}</span>
                                  <span>•</span>
                                  <span>{formatTime(entry.duration)} duration</span>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-sm text-white/70 drop-shadow-sm"
          >
            <p>Powered by Blink AI • High-quality speech recognition</p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default App