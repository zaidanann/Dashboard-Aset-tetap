import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

export const dynamic = 'force-dynamic'

export async function GET() {
  const filePath = process.env.EXCEL_FILE_PATH || ''
  const sheetName = process.env.EXCEL_SHEET_NAME || 'DATA ASET TETAP 2023'
  const resolved = filePath ? path.resolve(filePath) : ''
  const fileExists = resolved ? fs.existsSync(resolved) : false
  return NextResponse.json({ filePath: resolved, sheetName, fileExists, configured: !!filePath })
}
