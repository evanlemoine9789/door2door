import { supabase } from '@/lib/supabase'

/**
 * Generic CRUD utility functions for Supabase operations
 * Provides type-safe database operations that can be reused across different tables
 */

export interface CrudOptions {
  orderBy?: string
  ascending?: boolean
  limit?: number
  select?: string
}

export interface CrudFilters {
  [key: string]: any
}

/**
 * Generic fetch function for retrieving records from any table
 */
export async function genericFetch<T>(
  tableName: string,
  filters: CrudFilters = {},
  options: CrudOptions = {}
): Promise<T[]> {
  try {
    let query = supabase.from(tableName).select(options.select || '*')

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value)
        } else if (typeof value === 'string' && value.includes('%')) {
          query = query.ilike(key, value)
        } else {
          query = query.eq(key, value)
        }
      }
    })

    // Apply ordering
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false })
    }

    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error(`Error fetching from ${tableName}:`, error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error(`Error in genericFetch for ${tableName}:`, error)
    throw error
  }
}

/**
 * Generic fetch by ID function
 */
export async function genericFetchById<T>(
  tableName: string,
  id: string,
  select?: string
): Promise<T | null> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select(select || '*')
      .eq('id', id)
      .single()

    if (error) {
      console.error(`Error fetching ${tableName} by ID:`, error)
      throw error
    }

    return data
  } catch (error) {
    console.error(`Error in genericFetchById for ${tableName}:`, error)
    throw error
  }
}

/**
 * Generic create function for inserting new records
 */
export async function genericCreate<T, TInput>(
  tableName: string,
  data: TInput,
  mapper?: (input: TInput) => Partial<T>
): Promise<T> {
  try {
    const mappedData = mapper ? mapper(data) : data
    
    const { data: result, error } = await supabase
      .from(tableName)
      .insert([mappedData])
      .select()
      .single()

    if (error) {
      console.error(`Error creating ${tableName}:`, error)
      throw error
    }

    return result
  } catch (error) {
    console.error(`Error in genericCreate for ${tableName}:`, error)
    throw error
  }
}

/**
 * Generic update function for modifying existing records
 */
export async function genericUpdate<T, TUpdates>(
  tableName: string,
  id: string,
  updates: TUpdates,
  mapper?: (updates: TUpdates) => Partial<T>
): Promise<T> {
  try {
    const mappedUpdates = mapper ? mapper(updates) : updates
    
    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(mappedUpdates).filter(([_, value]) => value !== undefined)
    )

    const { data, error } = await supabase
      .from(tableName)
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error(`Error updating ${tableName}:`, error)
      throw error
    }

    return data
  } catch (error) {
    console.error(`Error in genericUpdate for ${tableName}:`, error)
    throw error
  }
}

/**
 * Generic delete function for removing records
 */
export async function genericDelete(tableName: string, id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id)

    if (error) {
      console.error(`Error deleting from ${tableName}:`, error)
      throw error
    }
  } catch (error) {
    console.error(`Error in genericDelete for ${tableName}:`, error)
    throw error
  }
}

/**
 * Generic search function with text search capabilities
 */
export async function genericSearch<T>(
  tableName: string,
  searchFields: string[],
  query: string,
  options: CrudOptions = {}
): Promise<T[]> {
  try {
    if (!query.trim()) {
      return []
    }

    // Build OR condition for multiple search fields
    const searchConditions = searchFields
      .map(field => `${field}.ilike.%${query}%`)
      .join(',')

    let dbQuery = supabase
      .from(tableName)
      .select(options.select || '*')
      .or(searchConditions)

    // Apply ordering
    if (options.orderBy) {
      dbQuery = dbQuery.order(options.orderBy, { ascending: options.ascending ?? false })
    }

    // Apply limit
    if (options.limit) {
      dbQuery = dbQuery.limit(options.limit)
    }

    const { data, error } = await dbQuery

    if (error) {
      console.error(`Error searching ${tableName}:`, error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error(`Error in genericSearch for ${tableName}:`, error)
    throw error
  }
}

/**
 * Generic count function for getting record counts
 */
export async function genericCount(
  tableName: string,
  filters: CrudFilters = {}
): Promise<number> {
  try {
    let query = supabase.from(tableName).select('*', { count: 'exact', head: true })

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value)
        } else if (typeof value === 'string' && value.includes('%')) {
          query = query.ilike(key, value)
        } else {
          query = query.eq(key, value)
        }
      }
    })

    const { count, error } = await query

    if (error) {
      console.error(`Error counting ${tableName}:`, error)
      throw error
    }

    return count || 0
  } catch (error) {
    console.error(`Error in genericCount for ${tableName}:`, error)
    throw error
  }
}

/**
 * Generic stats function for getting aggregated statistics
 */
export async function genericStats<T>(
  tableName: string,
  groupByField: string,
  filters: CrudFilters = {}
): Promise<Record<string, number>> {
  try {
    let query = supabase.from(tableName).select(groupByField)

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value)
        } else if (typeof value === 'string' && value.includes('%')) {
          query = query.ilike(key, value)
        } else {
          query = query.eq(key, value)
        }
      }
    })

    const { data, error } = await query

    if (error) {
      console.error(`Error getting stats for ${tableName}:`, error)
      throw error
    }

    // Aggregate the data
    const stats: Record<string, number> = {}
    data?.forEach((record: any) => {
      const value = record[groupByField] || 'Unknown'
      stats[value] = (stats[value] || 0) + 1
    })

    return stats
  } catch (error) {
    console.error(`Error in genericStats for ${tableName}:`, error)
    throw error
  }
}
