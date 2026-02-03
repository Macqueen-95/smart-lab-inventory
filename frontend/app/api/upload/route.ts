import { put } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/upload
 * Body: FormData with file "file" and optional "prefix" (e.g. "floor" or "icon")
 * Uploads to Vercel Blob and returns { url }.
 * Store URL in DB: floor_plans.floor_url or inventory_items.item_icon_url.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const prefix = (formData.get("prefix") as string) || "upload"

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    const safeName = `${prefix}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
    const blob = await put(safeName, file, { access: "public" })

    return NextResponse.json({ url: blob.url })
  } catch (err) {
    console.error("Upload error:", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
