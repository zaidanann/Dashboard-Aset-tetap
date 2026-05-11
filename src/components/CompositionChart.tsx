'use client'
import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { AsetEntry, formatShort } from '@/lib/data'

interface Props { entries: AsetEntry[] }

const COLORS = [
  { key: 'tanah', label: 'Tanah', color: '#1a3a5c' },
  { key: 'mesin', label: 'Peralatan & Mesin', color: '#2980b9' },
  { key: 'gedung', label: 'Gedung & Bangunan', color: '#27ae60' },
  { key: 'jalan', label: 'Jalan, Irigasi & Jaringan', color: '#e67e22' },
  { key: 'lainnya', label: 'Aset Lainnya', color: '#8e44ad' },
  { key: 'kdp', label: 'Konstruksi Dlm Pjrn', color: '#16a085' },
]

export default function CompositionChart({ entries }: Props) {
  const pieData = useMemo(() => {
    return COLORS.map(({ key, label, color }) => ({
      name: label,
      value: entries.reduce((s, e) => s + (e[key as keyof AsetEntry] as number), 0),
      color,
    })).filter(d => d.value > 0)
  }, [entries])

  const totalBruto = pieData.reduce((s, d) => s + d.value, 0)

  const CustomPieTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]
    const pct = totalBruto > 0 ? ((d.value / totalBruto) * 100).toFixed(1) : '0'
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-md p-3 text-xs">
        <div className="font-medium text-slate-800 mb-1">{d.name}</div>
        <div className="text-slate-600">{formatShort(d.value)}</div>
        <div className="text-slate-400">{pct}% dari total bruto</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
      <h2 className="text-base font-semibold text-[#1a3a5c] mb-4">Komposisi Aset Bruto per Kategori</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Donut */}
        <div>
          <div className="text-xs text-slate-500 mb-2">Proporsi Kategori</div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1 mt-2">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                <span className="truncate">{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary table */}
        <div>
          <div className="text-xs text-slate-500 mb-2">Nilai per Kategori</div>
          <div className="space-y-2">
            {pieData
              .slice()
              .sort((a, b) => b.value - a.value)
              .map((d, i) => {
                const pct = totalBruto > 0 ? (d.value / totalBruto) * 100 : 0
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-700 font-medium">{d.name}</span>
                      <span className="text-slate-800 font-semibold">{formatShort(d.value)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: d.color }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}
