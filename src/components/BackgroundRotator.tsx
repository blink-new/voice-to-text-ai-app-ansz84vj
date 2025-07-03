import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const natureImages = [
  {
    url: 'https://images.unsplash.com/photo-1648559544660-e0e354517f3f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NzI1Njd8MHwxfHNlYXJjaHwxfHxiZWF1dGlmdWwlMjBuYXR1cmUlMjBsYW5kc2NhcGUlMjBtb3VudGFpbiUyMGZvcmVzdHxlbnwwfDB8fHwxNzUxNTMyNTc1fDA&ixlib=rb-4.1.0&q=85',
    photographer: 'Matteo Piscioneri',
    description: 'A field of yellow flowers'
  },
  {
    url: 'https://images.unsplash.com/photo-1641278790320-b4222ef2f8f9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NzI1Njd8MHwxfHNlYXJjaHwyfHxiZWF1dGlmdWwlMjBuYXR1cmUlMjBsYW5kc2NhcGUlMjBtb3VudGFpbiUyMGZvcmVzdHxlbnwwfDB8fHwxNzUxNTMyNTc1fDA&ixlib=rb-4.1.0&q=85',
    photographer: 'Julia Kerner',
    description: 'A person walking up a hill at sunset'
  },
  {
    url: 'https://images.unsplash.com/photo-1703513522919-8b494af994c5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NzI1Njd8MHwxfHNlYXJjaHwzfHxiZWF1dGlmdWwlMjBuYXR1cmUlMjBsYW5kc2NhcGUlMjBtb3VudGFpbiUyMGZvcmVzdHxlbnwwfDB8fHwxNzUxNTMyNTc1fDA&ixlib=rb-4.1.0&q=85',
    photographer: 'Anton Volnuhin',
    description: 'Green mountain with waterfalls in fog'
  },
  {
    url: 'https://images.unsplash.com/photo-1588421033046-d7c051d496eb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NzI1Njd8MHwxfHNlYXJjaHw0fHxiZWF1dGlmdWwlMjBuYXR1cmUlMjBsYW5kc2NhcGUlMjBtb3VudGFpbiUyMGZvcmVzdHxlbnwwfDB8fHwxNzUxNTMyNTc1fDA&ixlib=rb-4.1.0&q=85',
    photographer: 'Sébastien Bourguet',
    description: 'Green and gray mountain under white clouds'
  },
  {
    url: 'https://images.unsplash.com/photo-1681128923778-f6476a4898fd?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NzI1Njd8MHwxfHNlYXJjaHw1fHxiZWF1dGlmdWwlMjBuYXR1cmUlMjBsYW5kc2NhcGUlMjBtb3VudGFpbiUyMGZvcmVzdHxlbnwwfDB8fHwxNzUxNTMyNTc1fDA&ixlib=rb-4.1.0&q=85',
    photographer: 'Luna Wang',
    description: 'Cattle grazing in a forest on a foggy day'
  },
  {
    url: 'https://images.unsplash.com/photo-1631343514496-2b019a53ea54?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NzI1Njd8MHwxfHNlYXJjaHc2fHxiZWF1dGlmdWwlMjBuYXR1cmUlMjBsYW5kc2NhcGUlMjBtb3VudGFpbiUyMGZvcmVzdHxlbnwwfDB8fHwxNzUxNTMyNTc1fDA&ixlib=rb-4.1.0&q=85',
    photographer: 'Hani Ryad',
    description: 'Beautiful lakeside landscape'
  }
]

export default function BackgroundRotator() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Preload first image
    const img = new Image()
    img.onload = () => setIsLoaded(true)
    img.src = natureImages[0].url

    // Set up rotation interval
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % natureImages.length
      )
    }, 15000) // 15 seconds

    return () => clearInterval(interval)
  }, [])

  const currentImage = natureImages[currentImageIndex]

  return (
    <div className="fixed inset-0 z-0">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentImageIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <div
            className="w-full h-full bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${currentImage.url})`,
            }}
          />
          
          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30" />
          
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />
        </motion.div>
      </AnimatePresence>
      
      {/* Photo credit */}
      <div className="absolute bottom-4 right-4 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="text-xs text-white/70 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full"
        >
          Photo by {currentImage.photographer}
        </motion.div>
      </div>
    </div>
  )
}