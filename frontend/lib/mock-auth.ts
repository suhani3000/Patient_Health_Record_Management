// Mock authentication system - no database required

export interface User {
  id: string
  email: string
  name: string
  role: "patient" | "doctor" | "lab" | "admin"
  isVerified: boolean
}

// Mock user database
const mockUsers: User[] = [
  {
    id: "1",
    email: "patient@demo.com",
    name: "John Doe",
    role: "patient",
    isVerified: true,
  },
  {
    id: "2",
    email: "doctor@demo.com",
    name: "Dr. Sarah Smith",
    role: "doctor",
    isVerified: true,
  },
  {
    id: "3",
    email: "lab@demo.com",
    name: "MediLab Testing",
    role: "lab",
    isVerified: true,
  },
  {
    id: "4",
    email: "admin@demo.com",
    name: "Admin User",
    role: "admin",
    isVerified: true,
  },
]

// Store current user in memory (in production, use proper session management)
let currentUser: User | null = null

export function login(email: string, password: string): User | null {
  // Mock login - accepts any password for demo purposes
  const user = mockUsers.find((u) => u.email === email)
  if (user) {
    currentUser = user
    // Store in localStorage for persistence across page reloads
    if (typeof window !== "undefined") {
      localStorage.setItem("currentUser", JSON.stringify(user))
    }
    return user
  }
  return null
}

export function signup(email: string, password: string, name: string, role: "patient" | "doctor" | "lab"): User {
  const newUser: User = {
    id: String(mockUsers.length + 1),
    email,
    name,
    role,
    isVerified: role === "patient", // Patients auto-verified, others need admin approval
  }
  mockUsers.push(newUser)
  currentUser = newUser
  if (typeof window !== "undefined") {
    localStorage.setItem("currentUser", JSON.stringify(newUser))
  }
  return newUser
}

export function logout() {
  currentUser = null
  if (typeof window !== "undefined") {
    localStorage.removeItem("currentUser")
  }
}

export function getCurrentUser(): User | null {
  if (currentUser) return currentUser

  // Try to restore from localStorage
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("currentUser")
    if (stored) {
      currentUser = JSON.parse(stored)
      return currentUser
    }
  }
  return null
}

export function getAllUsers(): User[] {
  return mockUsers
}
