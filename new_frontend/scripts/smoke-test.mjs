// Basic E2E smoke test for login + admin verify + patient grant/revoke + doctor access.
// Usage (from `new_frontend`): `node scripts/smoke-test.mjs`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function normalizeMongoId(val) {
  if (val == null) return null
  if (typeof val === "string") return val
  if (typeof val === "object") {
    if (typeof val.$oid === "string") return val.$oid
    if (typeof val.id === "string") return val.id
    if (typeof val.toHexString === "function") return val.toHexString()
    if (typeof val.toString === "function") return val.toString()
  }
  return String(val)
}

async function requestJson({ url, method = "GET", token, body }) {
  const headers = token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" }

  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    // ignore
  }
  return { status: res.status, text, json }
}

async function findWorkingBaseUrl() {
  const candidates = [process.env.BASE_URL, "http://localhost:3000", "http://localhost:3001"].filter(Boolean)
  for (const baseUrl of candidates) {
    try {
      // Admin login is hardcoded in the API and should work even if Mongo is unreachable.
      const r = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        body: JSON.stringify({ email: "admin@healthehr.com", password: "1234" }),
        headers: { "Content-Type": "application/json" },
      })
      if (r.ok) return baseUrl
    } catch {
      // ignore
    }
  }
  throw new Error("Could not reach Next.js server on candidate base URLs.")
}

async function main() {
  const baseUrl = await findWorkingBaseUrl()
  console.log("Base URL:", baseUrl)

  // 1) Admin login (admin credentials are hardcoded in the backend)
  const adminLogin = await requestJson({
    url: `${baseUrl}/api/auth/login`,
    method: "POST",
    body: { email: "admin@healthehr.com", password: "1234" },
  })
  if (adminLogin.status !== 200) throw new Error(`Admin login failed: ${adminLogin.status} ${adminLogin.text}`)

  const adminToken = adminLogin.json?.token
  if (!adminToken) throw new Error("Admin token missing from response.")
  console.log("Admin login OK")

  // 2) Register a patient + a doctor
  const seed = Date.now().toString().slice(-6)
  const patientEmail = `patient_${seed}@example.com`
  const doctorEmail = `doctor_${seed}@example.com`
  const password = "Passw0rd!"

  const patientRegister = await requestJson({
    url: `${baseUrl}/api/auth/register`,
    method: "POST",
    body: { email: patientEmail, password, name: `Patient ${seed}`, role: "patient" },
  })
  if (patientRegister.status !== 201) throw new Error(`Patient register failed: ${patientRegister.status} ${patientRegister.text}`)
  const patientId = normalizeMongoId(patientRegister.json?.user?._id)

  const doctorRegister = await requestJson({
    url: `${baseUrl}/api/auth/register`,
    method: "POST",
    body: {
      email: doctorEmail,
      password,
      name: `Doctor ${seed}`,
      role: "doctor",
      specialization: "General",
      licenseNumber: "LIC-123",
    },
  })
  if (doctorRegister.status !== 201) throw new Error(`Doctor register failed: ${doctorRegister.status} ${doctorRegister.text}`)
  const doctorId = normalizeMongoId(doctorRegister.json?.user?._id)

  console.log("Registered patient:", patientId)
  console.log("Registered doctor:", doctorId)

  // 3) Admin approves the doctor
  const verify = await requestJson({
    url: `${baseUrl}/api/admin/verify-user`,
    method: "POST",
    token: adminToken,
    body: { userId: doctorId, action: "approve" },
  })
  if (verify.status !== 200) throw new Error(`Verify-user failed: ${verify.status} ${verify.text}`)
  console.log("Doctor approved OK")

  // 4) Patient login
  const patientLogin = await requestJson({
    url: `${baseUrl}/api/auth/login`,
    method: "POST",
    body: { email: patientEmail, password },
  })
  if (patientLogin.status !== 200) throw new Error(`Patient login failed: ${patientLogin.status} ${patientLogin.text}`)
  const patientToken = patientLogin.json?.token
  console.log("Patient login OK")

  // 5) Patient grants access to doctor
  const grant = await requestJson({
    url: `${baseUrl}/api/patient/access/grant`,
    method: "POST",
    token: patientToken,
    body: { userId: doctorId, accessLevel: "view-upload" },
  })
  if (grant.status !== 201) {
    console.log("Grant response:", grant.json ?? grant.text)
    throw new Error(`Patient grant failed: ${grant.status} ${grant.text}`)
  }
  console.log("Access grant OK")

  // 6) Patient list access
  const list = await requestJson({
    url: `${baseUrl}/api/patient/access/list`,
    method: "GET",
    token: patientToken,
  })
  if (list.status !== 200) throw new Error(`Patient access list failed: ${list.status} ${list.text}`)
  console.log(
    "Access list OK (permissions count):",
    list.json?.permissions?.length,
    "sample:",
    list.json?.permissions?.[0],
  )

  const expectedPatientName = `Patient ${seed}`
  const expectedDoctorName = `Doctor ${seed}`
  const firstPerm = list.json?.permissions?.[0]
  if (!firstPerm?.grantedToUser?.name || firstPerm.grantedToUser.name === "Unknown") {
    throw new Error(
      `Access list enrichment failed: grantedToUser.name=${firstPerm?.grantedToUser?.name}`
    )
  }
  if (firstPerm.grantedToUser.name !== expectedDoctorName) {
    console.warn(
      `Doctor name mismatch (still not Unknown): expected "${expectedDoctorName}", got "${firstPerm.grantedToUser.name}"`
    )
  }

  // Patient audit logs should also be enriched with performedByUser.name.
  const patientAudit = await requestJson({
    url: `${baseUrl}/api/patient/audit-logs`,
    method: "GET",
    token: patientToken,
  })
  if (patientAudit.status !== 200) {
    throw new Error(`Patient audit-logs failed: ${patientAudit.status} ${patientAudit.text}`)
  }
  const firstLog = patientAudit.json?.logs?.[0]
  if (!firstLog?.performedByUser?.name || firstLog.performedByUser.name === "Unknown") {
    throw new Error(
      `Audit log enrichment failed: performedByUser.name=${firstLog?.performedByUser?.name}`
    )
  }
  if (firstLog.performedByUser.name !== expectedPatientName) {
    console.warn(
      `Patient audit-logs performer mismatch (still not Unknown): expected "${expectedPatientName}", got "${firstLog.performedByUser.name}"`
    )
  }

  // 8) Doctor login + doctor records endpoint (should return 200 even if no records yet)
  const doctorLogin = await requestJson({
    url: `${baseUrl}/api/auth/login`,
    method: "POST",
    body: { email: doctorEmail, password },
  })
  if (doctorLogin.status !== 200) throw new Error(`Doctor login failed: ${doctorLogin.status} ${doctorLogin.text}`)
  const doctorToken = doctorLogin.json?.token

  // Decode JWT payload so we can compare `user.userId` against the permission doc.
  const jwtPayloadB64 = doctorToken.split(".")[1]
  const jwtPayloadJson = Buffer.from(jwtPayloadB64, "base64").toString("utf8")
  const jwtPayload = JSON.parse(jwtPayloadJson)
  console.log("Doctor JWT payload:", {
    userId: jwtPayload.userId,
    role: jwtPayload.role,
    isVerified: jwtPayload.isVerified,
  })

  const doctorRecords = await requestJson({
    url: `${baseUrl}/api/doctor/records/${patientId}`,
    method: "GET",
    token: doctorToken,
  })
  console.log("Doctor records endpoint status:", doctorRecords.status)
  if (doctorRecords.status !== 200) {
    console.log("Doctor records response:", doctorRecords.json ?? doctorRecords.text)
  }

  const doctorPatients2 = await requestJson({
    url: `${baseUrl}/api/doctor/patients`,
    method: "GET",
    token: doctorToken,
  })
  if (doctorPatients2.status !== 200) {
    throw new Error(`Doctor patients failed: ${doctorPatients2.status} ${doctorPatients2.text}`)
  }
  const firstPatient = doctorPatients2.json?.patients?.[0]
  if (!firstPatient?.patientName || firstPatient.patientName === "Unknown") {
    throw new Error(`Doctor patients enrichment failed: patientName=${firstPatient?.patientName}`)
  }
  if (firstPatient.patientName !== expectedPatientName) {
    console.warn(
      `Doctor patients name mismatch (still not Unknown): expected "${expectedPatientName}", got "${firstPatient.patientName}"`
    )
  }

  // 7) Patient revoke access
  const revoke = await requestJson({
    url: `${baseUrl}/api/patient/access/revoke`,
    method: "POST",
    token: patientToken,
    body: { userId: doctorId },
  })
  if (revoke.status !== 200) {
    console.log("Revoke response:", revoke.json ?? revoke.text)
    throw new Error(`Patient revoke failed: ${revoke.status} ${revoke.text}`)
  }
  console.log("Access revoke OK")

  console.log("Smoke test finished successfully.")
}

main().catch((e) => {
  console.error("Smoke test failed:", e?.message || e)
  process.exit(1)
})

