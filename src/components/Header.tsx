'use client'
import { Building2 } from 'lucide-react'

export default function Header() {
  return (
    <header className="bg-[#1a3a5c] text-white shadow-lg">
      <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-700 flex-shrink-0">
          <Building2 size={22} />
        </div>
        <div>
          <div className="font-semibold text-base tracking-wide">
            DIREKTORAT JENDERAL BINA KEUANGAN DAERAH
          </div>
          <div className="text-xs text-blue-200 mt-0.5">
            KEMENTERIAN DALAM NEGERI &bull; DASHBOARD MONITORING ASET TETAP DAERAH
          </div>
        </div>
        <div className="ml-auto text-right text-xs text-blue-200">
          <div className="font-medium text-white text-sm">DATA ASET TETAP / NERACA</div>
          <div>Per 31 Desember 2023</div>
        </div>
      </div>
    </header>
  )
}
