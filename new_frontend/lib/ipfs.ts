import axios from "axios";
import FormData from "form-data";
import { Readable } from "stream";

export async function uploadFileToIPFS(
  buffer: Buffer,
  fileName: string
) {
  const formData = new FormData();

  // 🔑 CRITICAL: convert Buffer → stream (Pinata requires this on Windows)
  const stream = Readable.from(buffer);

  formData.append("file", stream, {
    filename: fileName,
    contentType: "application/octet-stream",
  });

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
  );

  return {
    cid: response.data.IpfsHash,
    size: response.data.PinSize,
  };
}
