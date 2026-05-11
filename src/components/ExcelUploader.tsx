'use client'
import { useRef, useState } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from 'lucide-react'

interface Props {
  onDataLoaded: (data: import('@/lib/data').AsetEntry[]) => void
  onSampleData: () => void
  entryCount: number
}

export default function ExcelUploader({ onDataLoaded, onSampleData, entryCount }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [sheets, setSheets] = useState<string[]>([])
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null)
  const [selectedSheet, setSelectedSheet] = useState('')

  const handleFile = async (file: File) => {
    if (!file) return
    setStatus('loading')
    setMessage('Membaca file...')

    try {
      const buf = await file.arrayBuffer()
      const { getAvailableSheets, parseExcelSheet, parseExcelFile } = await import('@/lib/excel')
      const sheetList = getAvailableSheets(buf)
      setBuffer(buf)
      setSheets(sheetList)

      // Auto-detect the best sheet
      const targetSheet = sheetList.find(s =>
        s.toUpperCase().includes('2023') || s.toUpperCase().includes('ASET TETAP 2023')
      ) || sheetList[0]

      setSelectedSheet(targetSheet)
      const data = parseExcelSheet(buf, targetSheet)

      if (data.length === 0) {
        setStatus('error')
        setMessage('Tidak ada data yang bisa dibaca. Pastikan kolom sesuai format (NO, DAERAH, TANAH, dst.)')
        return
      }

      onDataLoaded(data)
      setStatus('success')
      setMessage(`Berhasil memuat ${data.length} daerah dari sheet "${targetSheet}"`)
    } catch (err) {
      setStatus('error')
      setMessage('Gagal membaca file: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const handleSheetChange = async (sheetName: string) => {
    if (!buffer) return
    setSelectedSheet(sheetName)
    setStatus('loading')
    setMessage(`Memuat sheet "${sheetName}"...`)
    try {
      const { parseExcelSheet } = await import('@/lib/excel')
      const data = parseExcelSheet(buffer, sheetName)
      if (data.length === 0) {
        setStatus('error')
        setMessage(`Sheet "${sheetName}" tidak memiliki data yang bisa dibaca. Parser mencari kolom DAERAH sebagai penanda baris data. Coba sheet lain.`)
        return
      }
      onDataLoaded(data)
      setStatus('success')
      setMessage(`✓ Berhasil memuat ${data.length} daerah dari sheet "${sheetName}"`)
    } catch {
      setStatus('error')
      setMessage('Gagal membaca sheet.')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      handleFile(file)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#1a3a5c]">Sumber Data</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload file Excel Anda atau gunakan data contoh &bull; {entryCount} daerah aktif
          </p>
        </div>
        <button
          onClick={onSampleData}
          className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
        >
          Gunakan Data Contoh
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-slate-200 hover:border-[#1a3a5c] rounded-xl p-6 cursor-pointer text-center transition-colors group"
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <FileSpreadsheet size={28} className="mx-auto mb-2 text-slate-300 group-hover:text-[#1a3a5c] transition-colors" />
        <div className="text-sm font-medium text-slate-600 group-hover:text-[#1a3a5c]">
          Klik atau seret file Excel ke sini
        </div>
        <div className="text-xs text-slate-400 mt-1">
          Format: .xlsx atau .xls &bull; File: DATA ASET TETAP NERACA GABUNGAN
        </div>
      </div>

      {/* Status */}
      {status !== 'idle' && (
        <div className={`flex items-start gap-2 mt-3 p-3 rounded-lg text-sm ${
          status === 'success' ? 'bg-emerald-50 text-emerald-700'
          : status === 'error' ? 'bg-red-50 text-red-700'
          : 'bg-blue-50 text-blue-700'
        }`}>
          {status === 'success' && <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />}
          {status === 'error' && <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />}
          {status === 'loading' && (
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Sheet selector */}
      {sheets.length > 1 && (
        <div className="mt-3">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Pilih Sheet / Tab Excel:</label>
          <div className="flex flex-wrap gap-2">
            {sheets.map(s => (
              <button
                key={s}
                onClick={() => handleSheetChange(s)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  selectedSheet === s
                    ? 'bg-[#1a3a5c] text-white border-[#1a3a5c]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#1a3a5c]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Tip: Pilih sheet "DATA ASET TETAP 2023" atau tahun yang sesuai.
          </p>
        </div>
      )}

      {/* Column format guide */}
      <details className="mt-3">
        <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
          Format kolom yang dibutuhkan (klik untuk lihat)
        </summary>
        <div className="mt-2 bg-slate-50 rounded-lg p-3 text-xs text-slate-600 font-mono space-y-1">
          {['NO', 'DAERAH', 'TANAH', 'PERALATAN DAN MESIN', 'GEDUNG DAN BANGUNAN',
            'JALAN, IRIGASI DAN JARINGAN', 'ASET TETAP LAINNYA',
            'KONSTRUKSI DALAM PENGERJAAN', 'AKUMULASI PENYUSUTAN'].map(col => (
            <div key={col} className="flex gap-2">
              <span className="text-[#1a3a5c]">•</span> {col}
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
