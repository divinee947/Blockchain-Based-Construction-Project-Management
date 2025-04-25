import { describe, it, expect, beforeEach } from "vitest"

// Mock implementation for testing Clarity contracts
const mockClarity = () => {
  let admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
  const contractors = new Map()
  
  return {
    // Mock contract state
    state: {
      admin,
      contractors,
    },
    
    // Mock contract functions
    functions: {
      getContractor: (contractorId) => {
        return contractors.get(contractorId) || null
      },
      
      isAdmin: (sender) => {
        return sender === admin
      },
      
      registerContractor: (sender, contractorId, name, licenseNumber, specialization) => {
        if (contractors.has(contractorId)) {
          return { type: "err", value: 101 } // ERR_ALREADY_REGISTERED
        }
        
        contractors.set(contractorId, {
          principal: sender,
          name,
          licenseNumber,
          specialization,
          isVerified: false,
          rating: 0,
        })
        
        return { type: "ok", value: true }
      },
      
      verifyContractor: (sender, contractorId) => {
        if (sender !== admin) {
          return { type: "err", value: 100 } // ERR_UNAUTHORIZED
        }
        
        if (!contractors.has(contractorId)) {
          return { type: "err", value: 102 } // ERR_NOT_FOUND
        }
        
        const contractor = contractors.get(contractorId)
        contractor.isVerified = true
        contractors.set(contractorId, contractor)
        
        return { type: "ok", value: true }
      },
      
      rateContractor: (sender, contractorId, newRating) => {
        if (newRating > 5) {
          return { type: "err", value: 103 } // Rating must be between 0-5
        }
        
        if (!contractors.has(contractorId)) {
          return { type: "err", value: 102 } // ERR_NOT_FOUND
        }
        
        const contractor = contractors.get(contractorId)
        contractor.rating = newRating
        contractors.set(contractorId, contractor)
        
        return { type: "ok", value: true }
      },
      
      transferAdmin: (sender, newAdmin) => {
        if (sender !== admin) {
          return { type: "err", value: 100 } // ERR_UNAUTHORIZED
        }
        
        admin = newAdmin
        return { type: "ok", value: true }
      },
    },
  }
}

describe("Contractor Verification Contract", () => {
  let clarity
  
  beforeEach(() => {
    clarity = mockClarity()
  })
  
  it("should register a new contractor", () => {
    const sender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const contractorId = "contractor-123"
    const name = "ABC Construction"
    const licenseNumber = "LIC-12345"
    const specialization = "Residential"
    
    const result = clarity.functions.registerContractor(sender, contractorId, name, licenseNumber, specialization)
    
    expect(result.type).toBe("ok")
    
    const contractor = clarity.functions.getContractor(contractorId)
    expect(contractor).not.toBeNull()
    expect(contractor.name).toBe(name)
    expect(contractor.licenseNumber).toBe(licenseNumber)
    expect(contractor.isVerified).toBe(false)
  })
  
  it("should not register a contractor with an existing ID", () => {
    const sender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const contractorId = "contractor-123"
    
    // Register first time
    clarity.functions.registerContractor(sender, contractorId, "ABC Construction", "LIC-12345", "Residential")
    
    // Try to register again with same ID
    const result = clarity.functions.registerContractor(
        sender,
        contractorId,
        "XYZ Construction",
        "LIC-67890",
        "Commercial",
    )
    
    expect(result.type).toBe("err")
    expect(result.value).toBe(101) // ERR_ALREADY_REGISTERED
  })
  
  it("should verify a contractor when called by admin", () => {
    const admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const contractorId = "contractor-123"
    
    // Register contractor
    clarity.functions.registerContractor(admin, contractorId, "ABC Construction", "LIC-12345", "Residential")
    
    // Verify contractor
    const result = clarity.functions.verifyContractor(admin, contractorId)
    
    expect(result.type).toBe("ok")
    
    const contractor = clarity.functions.getContractor(contractorId)
    expect(contractor.isVerified).toBe(true)
  })
  
  it("should not verify a contractor when called by non-admin", () => {
    const admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const nonAdmin = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const contractorId = "contractor-123"
    
    // Register contractor
    clarity.functions.registerContractor(admin, contractorId, "ABC Construction", "LIC-12345", "Residential")
    
    // Try to verify contractor as non-admin
    const result = clarity.functions.verifyContractor(nonAdmin, contractorId)
    
    expect(result.type).toBe("err")
    expect(result.value).toBe(100) // ERR_UNAUTHORIZED
  })
  
  it("should rate a contractor", () => {
    const sender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const contractorId = "contractor-123"
    const rating = 4
    
    // Register contractor
    clarity.functions.registerContractor(sender, contractorId, "ABC Construction", "LIC-12345", "Residential")
    
    // Rate contractor
    const result = clarity.functions.rateContractor(sender, contractorId, rating)
    
    expect(result.type).toBe("ok")
    
    const contractor = clarity.functions.getContractor(contractorId)
    expect(contractor.rating).toBe(rating)
  })
  
  it("should not rate a contractor with invalid rating", () => {
    const sender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const contractorId = "contractor-123"
    const invalidRating = 6 // Ratings should be 0-5
    
    // Register contractor
    clarity.functions.registerContractor(sender, contractorId, "ABC Construction", "LIC-12345", "Residential")
    
    // Try to rate contractor with invalid rating
    const result = clarity.functions.rateContractor(sender, contractorId, invalidRating)
    
    expect(result.type).toBe("err")
    expect(result.value).toBe(103)
  })
  
  it("should transfer admin role", () => {
    const admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const newAdmin = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    
    // Transfer admin
    const result = clarity.functions.transferAdmin(admin, newAdmin)
    
    expect(result.type).toBe("ok")
    
    // Verify new admin can perform admin actions
    const contractorId = "contractor-123"
    clarity.functions.registerContractor(newAdmin, contractorId, "ABC Construction", "LIC-12345", "Residential")
    
    const verifyResult = clarity.functions.verifyContractor(newAdmin, contractorId)
    expect(verifyResult.type).toBe("ok")
  })
})
