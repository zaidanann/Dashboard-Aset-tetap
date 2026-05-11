'use client'
import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList
} from 'recharts'
import { AsetEntry, AsetEntryWithTotal, calcJumlah, formatShort, withTotals } from '@/lib/data'
import { X, ChevronUp, ChevronDown, Minus } from 'lucide-react'

interface Props { entries: AsetEntry[] }

const TOP_COLOR = '#1a3a5c'
const MID_COLOR = '#94a3b8'
const BOT_COLOR = '#c0392b'

function shortName(name: string) {
  return name
    .replace('Pemerintah Provinsi ', 'Prov. ')
    .replace('Pemerintah Kabupaten ', 'Kab. ')
    .replace('Pemerintah Kota ', 'Kota ')
    .replace('Kabupaten ', 'Kab. ')
    .replace('Provinsi ', 'Prov. ')
}

function truncate(s: string, max = 18) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: { fullName: string; jumlah: number; type: string; rank: number; total: number }; value: number }[] }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs max-w-xs">
      <div className="font-semibold text-slate-800 mb-1">{d.fullName}</div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">Aset Bersih</span>
        <span className="font-medium text-slate-800">{formatShort(d.jumlah)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">Peringkat</span>
        <span className="font-medium" style={{ color: d.type === 'top' ? TOP_COLOR : d.type === 'mid' ? MID_COLOR : BOT_COLOR }}>
          #{d.rank} dari {d.total}
        </span>
      </div>
    </div>
  )
}

type SortKey = 'jumlah' | 'tanah' | 'mesin' | 'gedung' | 'jalan' | 'lainnya' | 'kdp' | 'penyusutan'
type SortDir = 'desc' | 'asc'

export default function RankingChart({ entries }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('jumlah')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [search, setSearch] = useState('')

  const withTotal: AsetEntryWithTotal[] = useMemo(
    () => entries.map(withTotals).sort((a, b) => calcJumlah(b) - calcJumlah(a)),
    [entries]
  )

  const total = withTotal.length
  const top10 = withTotal.slice(0, 10)
  const bottom10 = withTotal.slice(Math.max(0, total - 10))
  const middleCount = Math.max(0, total - 20)

  // Build chart data: top10 + mid placeholder + bottom10
  const chartData = useMemo(() => {
    const topItems = top10.map((e, i) => ({
      name: truncate(shortName(e.daerah)),
      fullName: e.daerah,
      jumlah: calcJumlah(e),
      rank: i + 1,
      total,
      type: 'top' as const,
    }))

    const midItem = middleCount > 0
      ? [{
          name: `${middleCount} Daerah\nLainnya`,
          fullName: `${middleCount} Daerah Lainnya (klik untuk lihat semua)`,
          jumlah: withTotal.slice(10, total - 10).reduce((s, e) => s + calcJumlah(e), 0) / Math.max(1, middleCount),
          rank: 0,
          total,
          type: 'mid' as const,
          isMiddle: true,
        }]
      : []

    const botItems = bottom10.map((e, i) => ({
      name: truncate(shortName(e.daerah)),
      fullName: e.daerah,
      jumlah: calcJumlah(e),
      rank: total - bottom10.length + i + 1,
      total,
      type: 'bot' as const,
    }))

    return [...topItems, ...midItem, ...botItems]
  }, [withTotal, top10, bottom10, middleCount, total])

  // Modal sorted data
  const modalData = useMemo(() => {
    let data = withTotal.map((e, i) => ({ ...e, globalRank: i + 1 }))
    if (search) {
      data = data.filter(e => e.daerah.toLowerCase().includes(search.toLowerCase()))
    }
    data.sort((a, b) => {
      const va = a[sortKey as keyof typeof a] as number
      const vb = b[sortKey as keyof typeof b] as number
      return sortDir === 'desc' ? vb - va : va - vb
    })
    return data
  }, [withTotal, sortKey, sortDir, search])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <Minus size={10} className="text-slate-300" />
    return sortDir === 'desc'
      ? <ChevronDown size={10} className="text-white" />
      : <ChevronUp size={10} className="text-white" />
  }

  const barHeight = 42
  const chartHeight = Math.max(420, chartData.length * barHeight + 80)

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#1a3a5c]">
              Peringkat Aset Tetap Bersih per Daerah
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan 10 tertinggi &bull;{' '}
              {middleCount > 0 && (
                <button
                  onClick={() => setShowModal(true)}
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  {middleCount} daerah lainnya
                </button>
              )}
              {middleCount > 0 && ' \u2022 '}10 terendah &mdash; diurutkan dari terbesar ke terkecil
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-1.5 bg-[#1a3a5c] text-white rounded-lg text-xs font-medium hover:bg-[#22487a] transition-colors"
          >
            Lihat Semua Peringkat ({total} daerah)
          </button>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs mb-3 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: TOP_COLOR }} />
            10 Tertinggi
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: MID_COLOR }} />
            Rata-rata Daerah Lainnya (klik untuk detail)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: BOT_COLOR }} />
            10 Terendah
          </span>
        </div>

        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 80, left: 130, bottom: 0 }}
              barCategoryGap="15%"
              onClick={(data) => {
                if (data?.activePayload?.[0]?.payload?.isMiddle) setShowModal(true)
              }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                type="number"
                tickFormatter={formatShort}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={125}
                tick={{ fontSize: 10, fill: '#374151' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="jumlah" radius={[0, 4, 4, 0]} cursor="pointer">
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.type === 'top' ? TOP_COLOR
                      : entry.type === 'bot' ? BOT_COLOR
                      : MID_COLOR
                    }
                    fillOpacity={entry.type === 'mid' ? 0.6 : 1}
                  />
                ))}
                <LabelList
                  dataKey="jumlah"
                  position="right"
                  formatter={(v: number) => formatShort(v)}
                  style={{ fontSize: 10, fill: '#475569', fontWeight: 500 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {middleCount > 0 && (
          <div className="text-center mt-3">
            <button
              onClick={() => setShowModal(true)}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Klik untuk melihat urutan lengkap {total} daerah →
            </button>
          </div>
        )}
      </div>

      {/* FULL RANKING MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#1a3a5c] rounded-t-2xl">
              <div>
                <h3 className="text-white font-semibold">Peringkat Lengkap Aset Tetap Bersih</h3>
                <p className="text-blue-200 text-xs mt-0.5">
                  {total} daerah &bull; Klik header kolom untuk urutkan
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:text-blue-200 transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            {/* Search */}
            <div className="px-6 py-3 border-b border-slate-100">
              <input
                type="text"
                placeholder="Cari nama daerah..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1 scrollbar-thin">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-800 text-white">
                    {[
                      { label: 'Rank', key: null, w: '48px' },
                      { label: 'Daerah', key: null, w: '200px' },
                      { label: 'Tanah', key: 'tanah', w: '110px' },
                      { label: 'Peralatan & Mesin', key: 'mesin', w: '120px' },
                      { label: 'Gedung & Bangunan', key: 'gedung', w: '120px' },
                      { label: 'Jalan, Irigasi & Jaringan', key: 'jalan', w: '140px' },
                      { label: 'Aset Lainnya', key: 'lainnya', w: '100px' },
                      { label: 'KDP', key: 'kdp', w: '100px' },
                      { label: 'Akum. Penyusutan', key: 'penyusutan', w: '120px' },
                      { label: 'Jumlah Bersih', key: 'jumlah', w: '120px' },
                    ].map(({ label, key, w }) => (
                      <th
                        key={label}
                        style={{ minWidth: w }}
                        className={`px-3 py-2.5 text-left font-medium ${key ? 'cursor-pointer hover:bg-slate-700 select-none' : ''}`}
                        onClick={() => key && handleSort(key as SortKey)}
                      >
                        <span className="flex items-center gap-1">
                          {label}
                          {key && <SortIcon col={key as SortKey} />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modalData.map((e, i) => {
                    const jumlah = calcJumlah(e)
                    const isTop = e.globalRank <= 10
                    const isBot = e.globalRank > total - 10
                    const rankBg = isTop
                      ? 'bg-blue-50'
                      : isBot
                      ? 'bg-red-50'
                      : ''
                    const rankColor = isTop
                      ? 'text-[#1a3a5c] font-bold'
                      : isBot
                      ? 'text-red-700 font-bold'
                      : 'text-slate-400'

                    return (
                      <tr
                        key={e.id}
                        className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${rankBg}`}
                      >
                        <td className={`px-3 py-2 text-center ${rankColor}`}>
                          {isTop && <span className="mr-0.5">▲</span>}
                          {isBot && <span className="mr-0.5">▼</span>}
                          {e.globalRank}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-800 max-w-[200px] truncate" title={e.daerah}>
                          {e.daerah}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">{formatShort(e.tanah)}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{formatShort(e.mesin)}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{formatShort(e.gedung)}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{formatShort(e.jalan)}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{formatShort(e.lainnya)}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{formatShort(e.kdp)}</td>
                        <td className="px-3 py-2 text-right text-red-600">({formatShort(e.penyusutan)})</td>
                        <td className="px-3 py-2 text-right font-semibold text-[#1a3a5c]">
                          {formatShort(jumlah)}
                        </td>
                      </tr>
                    )
                  })}
                  {modalData.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-slate-400">
                        Tidak ada data yang cocok dengan pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
              <span>
                Menampilkan {modalData.length} dari {total} daerah
                {search && ` (filter: "${search}")`}
              </span>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-slate-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
