import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface DropdownCache {
  [key: string]: {
    data: string[]
    timestamp: number
  }
}

interface UseDropdownOptionsReturn {
  // Search functions
  searchPracticeTypes: (searchTerm: string) => Promise<string[]>
  searchStates: (searchTerm: string) => Promise<string[]>
  searchCities: (searchTerm: string) => Promise<string[]>
  
  // Loading states
  isLoadingPracticeTypes: boolean
  isLoadingStates: boolean
  isLoadingCities: boolean
  
  // Cache management
  clearCache: () => void
  getCacheStats: () => { size: number; keys: string[] }
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const MAX_RESULTS = 50
const MIN_SEARCH_LENGTH = 1

export function useDropdownOptions(): UseDropdownOptionsReturn {
  const [isLoadingPracticeTypes, setIsLoadingPracticeTypes] = useState(false)
  const [isLoadingStates, setIsLoadingStates] = useState(false)
  const [isLoadingCities, setIsLoadingCities] = useState(false)
  
  const cacheRef = useRef<DropdownCache>({})

  // Cache management functions
  const getCacheKey = (type: 'practice_types' | 'states' | 'cities', searchTerm: string) => {
    return `${type}:${searchTerm.toLowerCase().trim()}`
  }

  const getCachedData = (cacheKey: string): string[] | null => {
    const cached = cacheRef.current[cacheKey]
    if (!cached) return null
    
    const isExpired = Date.now() - cached.timestamp > CACHE_DURATION
    if (isExpired) {
      delete cacheRef.current[cacheKey]
      return null
    }
    
    return cached.data
  }

  const setCachedData = (cacheKey: string, data: string[]) => {
    cacheRef.current[cacheKey] = {
      data,
      timestamp: Date.now()
    }
  }

  const clearCache = useCallback(() => {
    cacheRef.current = {}
  }, [])

  const getCacheStats = useCallback(() => {
    return {
      size: Object.keys(cacheRef.current).length,
      keys: Object.keys(cacheRef.current)
    }
  }, [])

  // Search function for practice types
  const searchPracticeTypes = useCallback(async (searchTerm: string): Promise<string[]> => {
    if (searchTerm.length < MIN_SEARCH_LENGTH) {
      return []
    }

    const cacheKey = getCacheKey('practice_types', searchTerm)
    const cached = getCachedData(cacheKey)
    if (cached) {
      return cached
    }

    setIsLoadingPracticeTypes(true)
    try {
      const { data, error } = await supabase
        .from('cold_leads')
        .select('practice_type')
        .ilike('practice_type', `${searchTerm}%`)
        .not('practice_type', 'is', null)
        .order('practice_type')
        .limit(MAX_RESULTS)

      if (error) {
        console.error('Error searching practice types:', error)
        return []
      }

      const uniqueTypes = Array.from(new Set(
        data
          .map(row => row.practice_type)
          .filter(Boolean)
      )).sort()

      setCachedData(cacheKey, uniqueTypes)
      return uniqueTypes
    } catch (error) {
      console.error('Error in searchPracticeTypes:', error)
      return []
    } finally {
      setIsLoadingPracticeTypes(false)
    }
  }, [])

  // Search function for states
  const searchStates = useCallback(async (searchTerm: string): Promise<string[]> => {
    if (searchTerm.length < MIN_SEARCH_LENGTH) {
      return []
    }

    const cacheKey = getCacheKey('states', searchTerm)
    const cached = getCachedData(cacheKey)
    if (cached) {
      return cached
    }

    setIsLoadingStates(true)
    try {
      const { data, error } = await supabase
        .from('cold_leads')
        .select('state')
        .ilike('state', `${searchTerm}%`)
        .not('state', 'is', null)
        .order('state')
        .limit(MAX_RESULTS)

      if (error) {
        console.error('Error searching states:', error)
        return []
      }

      const uniqueStates = Array.from(new Set(
        data
          .map(row => row.state)
          .filter(Boolean)
      )).sort()

      setCachedData(cacheKey, uniqueStates)
      return uniqueStates
    } catch (error) {
      console.error('Error in searchStates:', error)
      return []
    } finally {
      setIsLoadingStates(false)
    }
  }, [])

  // Search function for cities
  const searchCities = useCallback(async (searchTerm: string): Promise<string[]> => {
    if (searchTerm.length < MIN_SEARCH_LENGTH) {
      return []
    }

    const cacheKey = getCacheKey('cities', searchTerm)
    const cached = getCachedData(cacheKey)
    if (cached) {
      return cached
    }

    setIsLoadingCities(true)
    try {
      const { data, error } = await supabase
        .from('cold_leads')
        .select('city')
        .ilike('city', `${searchTerm}%`)
        .not('city', 'is', null)
        .order('city')
        .limit(MAX_RESULTS)

      if (error) {
        console.error('Error searching cities:', error)
        return []
      }

      const uniqueCities = Array.from(new Set(
        data
          .map(row => row.city)
          .filter(Boolean)
      )).sort()

      setCachedData(cacheKey, uniqueCities)
      return uniqueCities
    } catch (error) {
      console.error('Error in searchCities:', error)
      return []
    } finally {
      setIsLoadingCities(false)
    }
  }, [])

  return {
    searchPracticeTypes,
    searchStates,
    searchCities,
    isLoadingPracticeTypes,
    isLoadingStates,
    isLoadingCities,
    clearCache,
    getCacheStats
  }
}
