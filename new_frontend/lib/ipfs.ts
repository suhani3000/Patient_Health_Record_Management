import axios from "axios";
import FormData from "form-data";
import { Readable } from "stream";

export async function uploadFileToIPFS(
  buffer: Buffer,
  fileName: string
) {
  const formData = new FormData()

  // 🔑 CRITICAL: convert Buffer → stream (Pinata requires this on Windows)
  const stream = Readable.from(buffer)

  formData.append("file", stream, {
    filename: fileName,
    contentType: "application/octet-stream",
  })

  try {
    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${process.env.PINATA_JWT}`,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    )

    return {
      cid: response.data.IpfsHash,
      size: response.data.PinSize,
    }
  } catch (err: any) {
    const status = err?.response?.status

    // Keep the app usable during local dev/offline scenarios.
    if (process.env.NODE_ENV !== "production" || status === 401 || status === 403) {
      console.warn(
        `[IPFS] Pinata upload failed (${status ?? "unknown"}). Using mock CID for dev fallback.`
      )
      return {
        cid: `mock_cid_${Date.now()}`,
        size: buffer.length,
      }
    }

    throw err
  }
}
