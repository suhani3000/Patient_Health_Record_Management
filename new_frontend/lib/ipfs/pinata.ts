import axios from "axios"

export async function uploadToPinata(file: File) {
  const data = new FormData()
  data.append("file", file)

  const res = await axios.post(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    data,
    {
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
      },
    }
  )

  return {
    cid: res.data.IpfsHash,
    url: `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`,
  }
}
