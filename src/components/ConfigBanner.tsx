'use client'
import { useState } from 'react'
import { CheckCircle, AlertTriangle, FileSpreadsheet, ChevronDown, ChevronUp, X } from 'lucide-react'

interface Props {
  config: { filePath: string; sheetName: string; fileExists: boolean; configured: boolean } | null
  error: string | null
  loading: boolean
  entryCount: number
}

export default function ConfigBanner({ config, error, loading, entryCount }: Props) {
  const [showSetup, setShowSetup] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (loading && !config) return null
  if (dismissed && config?.fileExists && !error) return null

  // All good
  if (config?.fileExists && !error) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-5 flex items-center gap-3">
        <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
        <div className="flex-1 text-sm text-emerald-800">
          <span className="font-medium">Terhubung ke Excel.</span>{' '}
          <span className="opacity-75">
            Membaca <strong>{entryCount} daerah</strong> dari{' '}
            <code className="bg-emerald-100 px-1 rounded text-xs">{config.sheetName}</code>
            {' — '}{config.filePath}
          </span>
        </div>
        <button onClick={() => setDismissed(true)} className="text-emerald-400 hover:text-emerald-600">
          <X size={16} />
        </button>
      </div>
    )
  }

  // Error or not configured
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-medium text-amber-900 text-sm mb-1">
            {!config?.configured
              ? 'File Excel belum dikonfigurasi'
              : !config?.fileExists
              ? 'File Excel tidak ditemukan'
              : error
              ? 'Error membaca Excel'
              : 'Mengatur koneksi...'}
          </div>
          {error && (
            <div className="text-xs text-amber-700 bg-amber-100 rounded px-2 py-1 font-mono mb-2">
              {error}
            </div>
          )}
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="flex items-center gap-1 text-xs text-amber-700 font-medium hover:text-amber-900"
          >
            <FileSpreadsheet size={13} />
            Cara setup koneksi Excel
            {showSetup ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {showSetup && (
        <div className="mt-4 space-y-3 text-sm text-amber-900">
          <div className="bg-white rounded-lg border border-amber-200 p-4">
            <div className="font-semibold mb-3 text-[#1a3a5c]">📋 Langkah Setup (sekali saja)</div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="w-6 h-6 bg-[#1a3a5c] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                <div>
                  <div className="font-medium">Buka file <code className="bg-slate-100 px-1 rounded">.env.local</code> di folder project</div>
                  <div className="text-xs text-slate-500 mt-0.5">Letaknya di root folder aset-tetap-dashboard/</div>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-6 h-6 bg-[#1a3a5c] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                <div>
                  <div className="font-medium">Ubah baris EXCEL_FILE_PATH:</div>
                  <div className="bg-slate-900 text-green-400 rounded p-3 text-xs font-mono mt-1">
                    <div className="text-slate-500"># Ganti dengan path file Excel Anda:</div>
                    <div>EXCEL_FILE_PATH=C:/Users/<strong className="text-yellow-300">NamaAnda</strong>/Documents/DATA ASET TETAP NERACA--GABUNGAN 2009-2023 (ok).xlsx</div>
                    <div className="mt-1">EXCEL_SHEET_NAME=DATA ASET TETAP 2023</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-6 h-6 bg-[#1a3a5c] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                <div>
                  <div className="font-medium">Restart server</div>
                  <div className="bg-slate-900 text-green-400 rounded p-3 text-xs font-mono mt-1">
                    <div className="text-slate-500"># Di terminal, tekan Ctrl+C lalu:</div>
                    <div>npm run dev</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">✓</span>
                <div className="text-emerald-800 font-medium">
                  Dashboard akan otomatis terhubung dan membaca data dari Excel Anda!
                </div>
              </div>
            </div>

            <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
              💡 <strong>Tip Windows:</strong> Untuk menemukan path file, klik kanan file Excel → Properties → Location, lalu tambahkan nama file di akhir.
              Gunakan <code>/</code> (bukan <code>\</code>) sebagai pemisah folder.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
