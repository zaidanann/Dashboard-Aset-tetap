import { NextRequest, NextResponse } from 'next/server'
import { appendExcelRow } from '@/lib/excelServer'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { daerah, tanah, mesin, gedung, jalan, lainnya, kdp, penyusutan } = body

    if (!daerah || typeof daerah !== 'string') {
      return NextResponse.json({ success: false, error: 'Nama daerah wajib diisi' }, { status: 400 })
    }

    const result = appendExcelRow({
      daerah: daerah.trim(),
      tanah: Number(tanah) || 0,
      mesin: Number(mesin) || 0,
      gedung: Number(gedung) || 0,
      jalan: Number(jalan) || 0,
      lainnya: Number(lainnya) || 0,
      kdp: Number(kdp) || 0,
      penyusutan: Number(penyusutan) || 0,
    })

    return NextResponse.json(result, { status: result.success ? 200 : 500 })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
