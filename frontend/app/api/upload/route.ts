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
    console.log("Upload request received")
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const prefix = (formData.get("prefix") as string) || "upload"

    if (!file || !(file instanceof File)) {
      console.error("No file provided in form data")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log(`Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}, prefix: ${prefix}`)

    if (!file.type.startsWith("image/")) {
      console.error(`Invalid file type: ${file.type}`)
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    const safeName = `${prefix}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
    console.log(`Generated safe name: ${safeName}`)

    // Check if token exists
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("BLOB_READ_WRITE_TOKEN is missing!")
      return NextResponse.json({ error: "Server configuration error: Token missing" }, { status: 500 })
    }

    const blob = await put(safeName, file, { access: "public" })
    console.log(`Upload successful: ${blob.url}`)

    return NextResponse.json({ url: blob.url })
  } catch (err) {
    console.error("Upload error detail:", err)
    return NextResponse.json({
      error: "Upload failed",
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 })
  }
}
