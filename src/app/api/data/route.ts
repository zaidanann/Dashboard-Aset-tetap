import { NextResponse } from 'next/server'
import { readExcelData } from '@/lib/excelServer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const result = readExcelData()
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    })
  } catch (e) {
    return NextResponse.json({ entries: [], error: String(e) }, { status: 500 })
  }
}
