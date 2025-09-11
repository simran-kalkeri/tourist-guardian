import React, { createContext, useContext, useState, useEffect } from 'react'
import languageService from '../services/languageService'

const LanguageContext = createContext()

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(languageService.getCurrentLanguage())
  const [translations, setTranslations] = useState(languageService.getTranslations())

  useEffect(() => {
    const handleLanguageChange = (event) => {
      const { language } = event.detail
      setCurrentLanguage(language)
      setTranslations(languageService.getTranslations(language))
    }

    window.addEventListener('languageChanged', handleLanguageChange)
    return () => window.removeEventListener('languageChanged', handleLanguageChange)
  }, [])

  const changeLanguage = (language) => {
    languageService.setLanguage(language)
  }

  const t = (key, params = {}) => {
    return languageService.t(key, params)
  }

  const value = {
    currentLanguage,
    translations,
    changeLanguage,
    t,
    availableLanguages: languageService.getAvailableLanguages()
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}





