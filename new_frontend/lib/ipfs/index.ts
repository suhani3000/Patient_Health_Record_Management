import { uploadToPinata } from "./pinata"

export { uploadToPinata as uploadFileToIPFS}

export async function uploadJSONToPinata(obj: unknown, fileName = "data.json") {
  const blob = new Blob([JSON.stringify(obj)], { type: "application/json" })
  const file = new File([blob], fileName, { type: "application/json" })
  return uploadToPinata(file)
}

export function cidToGatewayUrl(cid: string, gateway = "https://gateway.pinata.cloud/ipfs") {
  return `${gateway}/${cid}`
}
