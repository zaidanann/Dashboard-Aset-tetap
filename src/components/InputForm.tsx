'use client'
import { useState } from 'react'
import { PlusCircle, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Lock } from 'lucide-react'

interface Props {
  onSaved: () => void
  configured: boolean
  fileExists: boolean
}

const EMPTY = {
  daerah: '', tanah: '', mesin: '', gedung: '',
  jalan: '', lainnya: '', kdp: '', penyusutan: '',
}

type FormKey = keyof typeof EMPTY

const FIELDS: { key: FormKey; label: string; col: number }[] = [
  { key: 'tanah',      label: 'Tanah',                    col: 1 },
  { key: 'mesin',      label: 'Peralatan dan Mesin',       col: 2 },
  { key: 'gedung',     label: 'Gedung dan Bangunan',       col: 3 },
  { key: 'jalan',      label: 'Jalan, Irigasi & Jaringan', col: 4 },
  { key: 'lainnya',    label: 'Aset Tetap Lainnya',        col: 5 },
  { key: 'kdp',        label: 'Konstruksi Dalam Pengerjaan', col: 6 },
  { key: 'penyusutan', label: 'Akumulasi Penyusutan',      col: 7 },
]

function fmtPreview(v: string): string {
  const n = parseFloat(v)
  if (!v || isNaN(n)) return '—'
  if (n >= 1e12) return (n / 1e12).toFixed(2) + ' T'
  if (n >= 1e9)  return (n / 1e9).toFixed(2) + ' M'
  if (n >= 1e6)  return (n / 1e6).toFixed(1) + ' jt'
  return n.toLocaleString('id-ID')
}

export default function InputForm({ onSaved, configured, fileExists }: Props) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const bruto = FIELDS.filter(f => f.key !== 'penyusutan')
    .reduce((s, f) => s + (parseFloat(form[f.key]) || 0), 0)
  const jumlah = bruto - (parseFloat(form.penyusutan) || 0)

  const handleChange = (key: FormKey, val: string) => {
    setForm(prev => ({ ...prev, [key]: val }))
    setStatus(null)
  }

  const handleSubmit = async () => {
    if (!form.daerah.trim()) {
      setStatus({ type: 'error', msg: 'Nama daerah wajib diisi.' })
      return
    }

    setSaving(true)
    setStatus(null)

    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daerah: form.daerah,
          tanah: parseFloat(form.tanah) || 0,
          mesin: parseFloat(form.mesin) || 0,
          gedung: parseFloat(form.gedung) || 0,
          jalan: parseFloat(form.jalan) || 0,
          lainnya: parseFloat(form.lainnya) || 0,
          kdp: parseFloat(form.kdp) || 0,
          penyusutan: parseFloat(form.penyusutan) || 0,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setStatus({ type: 'success', msg: `Data "${form.daerah}" berhasil disimpan ke Excel (baris ${json.rowNumber}).` })
        setForm(EMPTY)
        onSaved()
      } else {
        setStatus({ type: 'error', msg: json.error || 'Gagal menyimpan.' })
      }
    } catch (e) {
      setStatus({ type: 'error', msg: 'Gagal terhubung ke server: ' + String(e) })
    } finally {
      setSaving(false)
    }
  }

  const canSave = configured && fileExists

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-5 overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1a3a5c] rounded-lg flex items-center justify-center">
            <PlusCircle size={16} className="text-white" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-[#1a3a5c] text-sm">Tambah Data Daerah Baru</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {canSave
                ? 'Input langsung tersimpan ke file Excel Anda'
                : 'Hubungkan file Excel dulu untuk mengaktifkan input'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!canSave && <Lock size={14} className="text-slate-400" />}
          {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-100">
          {!canSave && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4 text-xs text-amber-700 flex items-start gap-2">
              <Lock size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                Input form dikunci karena file Excel belum terhubung.
                Konfigurasi <code className="bg-amber-100 px-1 rounded">.env.local</code> terlebih dahulu, lalu restart server.
              </span>
            </div>
          )}

          <div className="mt-4 space-y-4">
            {/* Daerah */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Nama Daerah <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.daerah}
                onChange={e => handleChange('daerah', e.target.value)}
                placeholder="Contoh: Pemerintah Kabupaten Aceh Besar"
                disabled={!canSave}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            {/* Numeric fields grid */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Nilai Aset (Rupiah)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs text-slate-500 mb-1">{label}</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={form[key]}
                        onChange={e => handleChange(key, e.target.value)}
                        placeholder="0"
                        min="0"
                        disabled={!canSave}
                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 disabled:bg-slate-50 disabled:text-slate-400 ${
                          key === 'penyusutan' ? 'border-red-200 focus:ring-red-200' : 'border-slate-200'
                        }`}
                      />
                      {form[key] && (
                        <div className={`absolute -bottom-4 left-0 text-xs ${key === 'penyusutan' ? 'text-red-500' : 'text-slate-400'}`}>
                          {fmtPreview(form[key])}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live preview */}
            {(bruto > 0 || jumlah !== 0) && (
              <div className="bg-slate-50 rounded-xl p-4 mt-6 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Total Bruto</div>
                  <div className="font-semibold text-slate-800">{fmtPreview(String(bruto))}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Penyusutan</div>
                  <div className="font-semibold text-red-600">({fmtPreview(form.penyusutan || '0')})</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Jumlah Bersih</div>
                  <div className={`font-bold text-base ${jumlah >= 0 ? 'text-[#1a3a5c]' : 'text-red-600'}`}>
                    {fmtPreview(String(jumlah))}
                  </div>
                </div>
              </div>
            )}

            {/* Status */}
            {status && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {status.type === 'success'
                  ? <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
                  : <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />}
                {status.msg}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSubmit}
                disabled={!canSave || saving}
                className="px-6 py-2.5 bg-[#1a3a5c] hover:bg-[#22487a] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Menyimpan ke Excel...
                  </>
                ) : (
                  <>
                    <PlusCircle size={16} />
                    Simpan ke Excel
                  </>
                )}
              </button>
              <button
                onClick={() => { setForm(EMPTY); setStatus(null) }}
                disabled={saving}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors"
              >
                Reset
              </button>
              <span className="text-xs text-slate-400 ml-auto">
                Data akan ditambahkan sebagai baris baru di sheet{' '}
                <strong>{process.env.NEXT_PUBLIC_SHEET_NAME || 'DATA ASET TETAP 2023'}</strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
