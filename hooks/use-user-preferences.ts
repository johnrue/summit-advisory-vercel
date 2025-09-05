'use client'

import { useState, useEffect } from 'react'

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  viewMode: 'compact' | 'comfortable'
  sidebarCollapsed: boolean
  notifications: boolean
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  viewMode: 'comfortable',
  sidebarCollapsed: false,
  notifications: true
}

const PREFERENCES_KEY = 'summit-advisory-preferences'

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREFERENCES_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as UserPreferences
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed })
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }, [])

  // Save preferences to localStorage
  const savePreferences = (newPreferences: Partial<UserPreferences>) => {
    try {
      const updated = { ...preferences, ...newPreferences }
      setPreferences(updated)
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated))
    } catch (error) {
    }
  }

  // Individual preference setters
  const setTheme = (theme: UserPreferences['theme']) => {
    savePreferences({ theme })
  }

  const setViewMode = (viewMode: UserPreferences['viewMode']) => {
    savePreferences({ viewMode })
  }

  const setSidebarCollapsed = (collapsed: boolean) => {
    savePreferences({ sidebarCollapsed: collapsed })
  }

  const setNotifications = (enabled: boolean) => {
    savePreferences({ notifications: enabled })
  }

  // Reset to defaults
  const resetPreferences = () => {
    try {
      setPreferences(DEFAULT_PREFERENCES)
      localStorage.removeItem(PREFERENCES_KEY)
    } catch (error) {
    }
  }

  return {
    preferences,
    loading,
    setTheme,
    setViewMode,
    setSidebarCollapsed,
    setNotifications,
    resetPreferences,
    savePreferences
  }
}