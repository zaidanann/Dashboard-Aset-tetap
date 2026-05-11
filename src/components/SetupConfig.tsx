'use client'
import { useState } from 'react'
import { Settings, Copy, CheckCircle, FolderOpen } from 'lucide-react'

interface Props {
  onDismiss: () => void
}

export default function SetupConfig({ onDismiss }: Props) {
  const [copied, setCopied] = useState(false)

  const exampleEnv = `EXCEL_FILE_PATH=C:\\Users\\NamaAnda\\Documents\\DATA ASET TETAP NERACA--GABUNGAN 2009-2023 (ok).xlsx
EXCEL_SHEET_NAME=DATA ASET TETAP 2023`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(exampleEnv)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6 mb-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Settings size={20} className="text-amber-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-amber-900">Setup Koneksi Excel</h2>
          <p className="text-sm text-amber-700 mt-0.5">
            Untuk auto-load dan simpan data langsung ke file Excel Anda, ikuti langkah berikut:
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Step 1 */}
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
          <div>
            <div className="text-sm font-medium text-amber-900">Buat file <code className="bg-amber-100 px-1 rounded">.env.local</code> di root folder project</div>
            <div className="text-xs text-amber-600 mt-0.5">Sejajar dengan file <code>package.json</code></div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
          <div className="flex-1">
            <div className="text-sm font-medium text-amber-900 mb-2">Isi dengan path file Excel Anda:</div>
            <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-green-400 relative">
              <div className="whitespace-pre">{exampleEnv}</div>
              <button
                onClick={copyToClipboard}
                className="absolute top-2 right-2 p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                title="Copy"
              >
                {copied ? <CheckCircle size={14} className="text-green-400" /> : <Copy size={14} className="text-slate-300" />}
              </button>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
          <div>
            <div className="text-sm font-medium text-amber-900">Cara cari path file Excel</div>
            <div className="text-xs text-amber-700 mt-1 space-y-1">
              <div>• <b>Windows:</b> Klik kanan file Excel → Properties → Location. Gabungkan dengan nama file.</div>
              <div>• Contoh: <code className="bg-amber-100 px-1 rounded text-amber-900">C:\Users\Budi\Documents\DATA ASET TETAP NERACA--GABUNGAN 2009-2023 (ok).xlsx</code></div>
              <div>• Gunakan backslash <code className="bg-amber-100 px-1 rounded">\</code> di Windows, atau forward slash <code className="bg-amber-100 px-1 rounded">/</code> di Mac/Linux</div>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</div>
          <div>
            <div className="text-sm font-medium text-amber-900">Restart server</div>
            <div className="text-xs text-amber-700 mt-0.5">
              Tekan <code className="bg-amber-100 px-1 rounded">Ctrl+C</code> di terminal, lalu jalankan lagi <code className="bg-amber-100 px-1 rounded">npm run dev</code>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={onDismiss}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          Sudah dikonfigurasi, coba lagi
        </button>
        <button
          onClick={onDismiss}
          className="px-4 py-2 bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 rounded-xl text-sm font-medium transition-colors"
        >
          Lewati, gunakan upload manual
        </button>
      </div>
    </div>
  )
}
