'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Header from '@/components/Header'
import MetricCards from '@/components/MetricCards'
import RankingChart from '@/components/RankingChart'
import CompositionChart from '@/components/CompositionChart'
import InputForm from '@/components/InputForm'
import ConfigBanner from '@/components/ConfigBanner'
import { AsetEntry } from '@/lib/data'

const REFRESH_INTERVAL = Number(process.env.NEXT_PUBLIC_REFRESH_INTERVAL || 30) * 1000

export default function Home() {
  const [entries, setEntries] = useState<AsetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<{ filePath: string; sheetName: string; fileExists: boolean; configured: boolean } | null>(null)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/data', { cache: 'no-store' })
      const json = await res.json()
      if (json.error) {
        setError(json.error)
      } else {
        setError(null)
        setEntries(json.entries || [])
        setLastUpdated(new Date())
      }
    } catch (e) {
      setError('Gagal terhubung ke server: ' + String(e))
    } finally {
      setLoading(false)
      setCountdown(REFRESH_INTERVAL / 1000)
    }
  }, [])

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config')
      const json = await res.json()
      setConfig(json)
    } catch {}
  }, [])

  useEffect(() => { fetchData(); fetchConfig() }, [fetchData, fetchConfig])
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchData])
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown(c => c > 0 ? c - 1 : REFRESH_INTERVAL / 1000)
    }, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [])

  const handleSaved = () => { setTimeout(() => fetchData(true), 500) }

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <Header />
      <div className="bg-[#122844] text-white px-6 py-1.5 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-400' : 'bg-emerald-400'} animate-pulse`} />
          <span className="opacity-75">
            {error ? 'Tidak terhubung ke Excel' : config?.fileExists ? 'Terhubung langsung ke Excel' : 'Mengatur koneksi...'}
          </span>
        </div>
        {lastUpdated && <span className="opacity-50">Diperbarui: {lastUpdated.toLocaleTimeString('id-ID')}</span>}
        <div className="ml-auto flex items-center gap-3">
          <span className="opacity-50">Auto-refresh dalam {countdown}s</span>
          <button onClick={() => fetchData()} className="px-3 py-0.5 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors">
            ↻ Refresh Sekarang
          </button>
        </div>
      </div>
      <main className="max-w-screen-2xl mx-auto px-4 md:px-6 py-6">
        <ConfigBanner config={config} error={error} loading={loading} entryCount={entries.length} />
        {loading && entries.length === 0 && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-[#1a3a5c] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <div className="text-slate-500 text-sm">Membaca data dari Excel...</div>
            </div>
          </div>
        )}
        {entries.length > 0 && (
          <>
            <MetricCards entries={entries} />
            <RankingChart entries={entries} />
            <CompositionChart entries={entries} />
          </>
        )}
        <InputForm onSaved={handleSaved} configured={config?.configured ?? false} fileExists={config?.fileExists ?? false} />
        <footer className="text-center text-xs text-slate-400 py-6 border-t border-slate-200 mt-4">
          Dashboard Monitoring Aset Tetap Daerah &bull; Direktorat Jenderal Bina Keuangan Daerah &bull; Kementerian Dalam Negeri
        </footer>
      </main>
    </div>
  )
}
