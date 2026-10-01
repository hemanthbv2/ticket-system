import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import path from "path";

const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
];

const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".pdf",
];

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Server-side magic bytes validation
 */
function validateMagicBytes(buffer: Buffer, mime: string): boolean {
  if (buffer.length < 4) return false;

  switch (mime) {
    case "image/jpeg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/png":
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    case "image/gif":
      return (
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38
      );
    case "image/webp":
      // RIFF....WEBP
      return (
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP"
      );
    case "application/pdf":
      return buffer.toString("ascii", 0, 5) === "%PDF-";
    case "image/svg+xml": {
      const snippet = buffer.toString("utf8", 0, Math.min(buffer.length, 1024));
      return snippet.includes("<svg") || snippet.includes("<?xml");
    }
    default:
      return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const storage = getStorage();
    const results: { url: string; name: string; mime: string; size: number }[] = [];

    for (const file of files) {
      // 1. Validate file size
      if (file.size <= 0) {
        return NextResponse.json(
          { error: `File is empty: ${file.name}` },
          { status: 400 }
        );
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          {
            error: `File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB, max 10MB)`,
          },
          { status: 400 }
        );
      }

      // 2. Validate MIME type
      if (!ALLOWED_MIME.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, GIF, WEBP, SVG, PDF` },
          { status: 400 }
        );
      }

      // 3. Validate file extension
      const ext = path.extname(file.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          { error: `Invalid file extension: ${ext}` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      // 4. Validate magic bytes against MIME type
      if (!validateMagicBytes(buffer, file.type)) {
        return NextResponse.json(
          { error: `Corrupted or spoofed file content for ${file.name}` },
          { status: 400 }
        );
      }

      const url = await storage.save(buffer, file.name, file.type);

      results.push({
        url,
        name: file.name,
        mime: file.type,
        size: file.size,
      });
    }

    return NextResponse.json({ files: results });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
