/**
 * Formats a long identifier (like a wallet address or DID) into a human-readable string.
 * If a name is provided in the mapping, it returns the name.
 * Otherwise, it returns a truncated version of the address.
 */
export function formatIdentifier(id: string, name?: string, role?: string): string {
  if (name) {
    if (role === "doctor") return `Dr. ${name}`
    if (role === "lab") return `${name} (Lab)`
    return name
  }

  if (!id) return "Unknown"
  
  // If it's a hex address (0x...) or long decentralized ID
  if (id.startsWith("0x") && id.length > 10) {
    return `${id.substring(0, 6)}...${id.substring(id.length - 4)}`
  }
  
  if (id.includes(":") && id.length > 20) {
    const parts = id.split(":")
    const lastPart = parts[parts.length - 1]
    return `ID: ${lastPart.substring(0, 4)}...${lastPart.substring(lastPart.length - 4)}`
  }

  return id
}

/**
 * Returns a CSS class or badge type for a given role.
 */
export function getRoleBadgeStyle(role: string): string {
  switch (role?.toLowerCase()) {
    case "doctor": return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
    case "lab": return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300"
    case "patient": return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300"
    case "admin": return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
    default: return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300"
  }
}
