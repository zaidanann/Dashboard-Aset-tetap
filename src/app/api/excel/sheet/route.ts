import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import {
  getConfiguredPath,
  resolvePath,
  loadWorkbook,
  readEntriesFromSheet,
} from '@/lib/server-excel'

// POST /api/excel/sheet  { sheetName: string }
export async function POST(req: NextRequest) {
  const rawPath = getConfiguredPath()
  if (!rawPath) return NextResponse.json({ entries: [], error: 'Path tidak dikonfigurasi' }, { status: 400 })

  const filePath = resolvePath(rawPath)
  if (!fs.existsSync(filePath)) return NextResponse.json({ entries: [], error: 'File tidak ditemukan' }, { status: 404 })

  const { sheetName } = await req.json()
  if (!sheetName) return NextResponse.json({ entries: [], error: 'sheetName diperlukan' }, { status: 400 })

  try {
    const wb = loadWorkbook(filePath)
    const ws = wb.Sheets[sheetName]
    if (!ws) return NextResponse.json({ entries: [], error: `Sheet "${sheetName}" tidak ada` }, { status: 404 })

    const entries = readEntriesFromSheet(ws)
    return NextResponse.json({ entries, sheetName })
  } catch (err) {
    return NextResponse.json({ entries: [], error: String(err) }, { status: 500 })
  }
}
