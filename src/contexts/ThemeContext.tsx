'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface ThemeContextType {
  dark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({ dark: true, toggleTheme: () => {} })

export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem('theme')
    const isDark = stored !== null ? stored === 'dark' : true
    applyTheme(isDark)
    setDark(isDark)
    setMounted(true)
  }, [])

  const applyTheme = (isDark: boolean) => {
    const html = document.documentElement
    if (isDark) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    applyTheme(next)
    window.localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  // Evitar flash no primeiro render
  if (!mounted) return null

  return (
    <ThemeContext.Provider value={{ dark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
