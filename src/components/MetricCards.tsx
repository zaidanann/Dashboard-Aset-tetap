'use client'
import { AsetEntry, calcBruto, calcJumlah, formatShort } from '@/lib/data'
import { TrendingUp, TrendingDown, MapPin, Database } from 'lucide-react'

interface Props { entries: AsetEntry[] }

export default function MetricCards({ entries }: Props) {
  const totalDaerah = entries.length
  const totalBruto = entries.reduce((s, e) => s + calcBruto(e), 0)
  const totalPenyusutan = entries.reduce((s, e) => s + e.penyusutan, 0)
  const totalBersih = entries.reduce((s, e) => s + calcJumlah(e), 0)
  const pctPenyusutan = totalBruto > 0 ? ((totalPenyusutan / totalBruto) * 100).toFixed(1) : '0'

  const sorted = [...entries].sort((a, b) => calcJumlah(b) - calcJumlah(a))
  const top = sorted[0]
  const bottom = sorted[sorted.length - 1]

  const cards = [
    {
      icon: <MapPin size={18} />,
      label: 'Jumlah Daerah',
      value: totalDaerah.toString(),
      sub: 'entri data',
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      iconColor: 'text-blue-600',
    },
    {
      icon: <Database size={18} />,
      label: 'Total Aset Bruto',
      value: formatShort(totalBruto),
      sub: 'Rupiah',
      color: 'bg-slate-50 border-slate-200 text-slate-700',
      iconColor: 'text-slate-600',
    },
    {
      icon: <TrendingDown size={18} />,
      label: 'Akumulasi Penyusutan',
      value: formatShort(totalPenyusutan),
      sub: `${pctPenyusutan}% dari bruto`,
      color: 'bg-red-50 border-red-200 text-red-700',
      iconColor: 'text-red-600',
    },
    {
      icon: <TrendingUp size={18} />,
      label: 'Total Aset Bersih',
      value: formatShort(totalBersih),
      sub: 'Nilai buku neto',
      color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      iconColor: 'text-emerald-600',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      {cards.map((c, i) => (
        <div key={i} className={`rounded-xl border p-4 ${c.color}`}>
          <div className={`flex items-center gap-2 mb-1 ${c.iconColor}`}>
            {c.icon}
            <span className="text-xs font-medium uppercase tracking-wide">{c.label}</span>
          </div>
          <div className="text-xl font-bold mt-1">{c.value}</div>
          <div className="text-xs opacity-70 mt-0.5">{c.sub}</div>
        </div>
      ))}

      {top && (
        <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
          <div className="text-2xl font-bold text-amber-500">#1</div>
          <div>
            <div className="text-xs text-amber-600 font-medium uppercase tracking-wide">Aset Terbesar</div>
            <div className="font-semibold text-amber-900 text-sm">{top.daerah}</div>
            <div className="text-xs text-amber-600">{formatShort(calcJumlah(top))} Rupiah</div>
          </div>
        </div>
      )}

      {bottom && entries.length > 1 && (
        <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-4">
          <div className="text-2xl font-bold text-slate-400">#{entries.length}</div>
          <div>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Aset Terkecil</div>
            <div className="font-semibold text-slate-700 text-sm">{bottom.daerah}</div>
            <div className="text-xs text-slate-500">{formatShort(calcJumlah(bottom))} Rupiah</div>
          </div>
        </div>
      )}
    </div>
  )
}
