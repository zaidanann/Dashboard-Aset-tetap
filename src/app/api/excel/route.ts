import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import {
  getConfiguredPath,
  getConfiguredSheet,
  resolvePath,
  loadWorkbook,
  readEntriesFromSheet,
  appendEntryToSheet,
  saveWorkbook,
} from '@/lib/server-excel'

// ── GET /api/excel ──────────────────────────────────────────────────────────
// Returns: { entries, sheetName, filePath, error? }
export async function GET() {
  const rawPath = getConfiguredPath()

  if (!rawPath) {
    return NextResponse.json({
      entries: [],
      sheetName: null,
      filePath: null,
      configured: false,
      error: 'EXCEL_FILE_PATH belum diisi di file .env.local',
    })
  }

  const filePath = resolvePath(rawPath)

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({
      entries: [],
      sheetName: null,
      filePath,
      configured: true,
      error: `File tidak ditemukan: ${filePath}`,
    }, { status: 404 })
  }

  try {
    const sheetName = getConfiguredSheet()
    const wb = loadWorkbook(filePath)

    const availableSheets = wb.SheetNames

    if (!availableSheets.includes(sheetName)) {
      // Try to find a close match
      const match = availableSheets.find(s =>
        s.toUpperCase().includes('ASET TETAP 2023') || s.toUpperCase().includes('DATA ASET')
      )
      if (!match) {
        return NextResponse.json({
          entries: [],
          sheetName,
          filePath,
          configured: true,
          availableSheets,
          error: `Sheet "${sheetName}" tidak ditemukan. Sheet tersedia: ${availableSheets.join(', ')}`,
        }, { status: 404 })
      }
      const ws = wb.Sheets[match]
      const entries = readEntriesFromSheet(ws)
      return NextResponse.json({ entries, sheetName: match, filePath, configured: true, availableSheets })
    }

    const ws = wb.Sheets[sheetName]
    const entries = readEntriesFromSheet(ws)

    return NextResponse.json({
      entries,
      sheetName,
      filePath,
      configured: true,
      availableSheets,
    })
  } catch (err) {
    return NextResponse.json({
      entries: [],
      sheetName: null,
      filePath,
      configured: true,
      error: `Gagal membaca file: ${err instanceof Error ? err.message : String(err)}`,
    }, { status: 500 })
  }
}

// ── POST /api/excel ─────────────────────────────────────────────────────────
// Body: { entry: AsetEntry, sheetName?: string }
// Returns: { success, message, totalEntries }
export async function POST(req: NextRequest) {
  const rawPath = getConfiguredPath()

  if (!rawPath) {
    return NextResponse.json({
      success: false,
      message: 'EXCEL_FILE_PATH belum diisi di .env.local',
    }, { status: 400 })
  }

  const filePath = resolvePath(rawPath)

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({
      success: false,
      message: `File tidak ditemukan: ${filePath}`,
    }, { status: 404 })
  }

  try {
    const body = await req.json()
    const { entry, sheetName: reqSheet } = body

    if (!entry || !entry.daerah) {
      return NextResponse.json({ success: false, message: 'Data entry tidak lengkap' }, { status: 400 })
    }

    const sheetName = reqSheet || getConfiguredSheet()
    const wb = loadWorkbook(filePath)

    const updatedWb = appendEntryToSheet(wb, sheetName, entry)
    saveWorkbook(updatedWb, filePath)

    // Read back to confirm and get new count
    const ws = updatedWb.Sheets[sheetName]
    const entries = ws ? readEntriesFromSheet(ws) : []

    return NextResponse.json({
      success: true,
      message: `Data "${entry.daerah}" berhasil disimpan ke Excel`,
      totalEntries: entries.length,
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      message: `Gagal menyimpan: ${err instanceof Error ? err.message : String(err)}`,
    }, { status: 500 })
  }
}

// ── DELETE /api/excel ───────────────────────────────────────────────────────
// Body: { daerah: string, sheetName?: string }
// Finds and removes a row by matching DAERAH value
export async function DELETE(req: NextRequest) {
  const rawPath = getConfiguredPath()
  if (!rawPath) return NextResponse.json({ success: false, message: 'Path tidak dikonfigurasi' }, { status: 400 })

  const filePath = resolvePath(rawPath)
  if (!fs.existsSync(filePath)) return NextResponse.json({ success: false, message: 'File tidak ditemukan' }, { status: 404 })

  // Note: Deleting a row in Excel (shifting rows up) is complex with xlsx library.
  // We implement this by: reading all entries, removing the target, rewriting the data section.
  return NextResponse.json({
    success: false,
    message: 'Fitur hapus dari Excel belum tersedia. Hapus manual dari Excel untuk menghindari kerusakan format.',
  }, { status: 501 })
}
