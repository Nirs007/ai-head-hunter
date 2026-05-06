import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ScanContext = createContext(null)

export const DEFAULT_SCAN = {
  jobTitle: '',
  matching: false,
  quickMatching: false,
  matchMode: null,      // 'quick' | 'deep'
  matchProgress: null,
  results: null,
  partialResults: [],   // accumulated during scan — restored when component remounts
}

export function ScanProvider({ children }) {
  const [scans, setScans] = useState({})
  // Map of jobId → abort function; stored in a ref to avoid triggering re-renders
  const abortFnsRef = useRef({})

  const updateScan = useCallback((jobId, patch) => {
    setScans(prev => ({
      ...prev,
      [jobId]: { ...(prev[jobId] || DEFAULT_SCAN), ...patch },
    }))
  }, [])

  // Register the abort function for a running scan (called by JobCard on scan start)
  const registerAbort = useCallback((jobId, fn) => {
    abortFnsRef.current[jobId] = fn
  }, [])

  // Unregister when scan finishes (called by JobCard in finally)
  const unregisterAbort = useCallback((jobId) => {
    delete abortFnsRef.current[jobId]
  }, [])

  // Cancel a running scan — works even if the originating JobCard is unmounted
  const cancelScan = useCallback((jobId) => {
    if (abortFnsRef.current[jobId]) {
      abortFnsRef.current[jobId]()
      // Don't delete here — the finally block in JobCard's SSE loop will call unregisterAbort
    }
  }, [])

  return (
    <ScanContext.Provider value={{ scans, updateScan, registerAbort, unregisterAbort, cancelScan }}>
      {children}
    </ScanContext.Provider>
  )
}

export function useScanContext() {
  return useContext(ScanContext)
}
