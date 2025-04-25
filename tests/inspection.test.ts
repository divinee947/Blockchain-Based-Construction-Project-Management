import { describe, it, expect, beforeEach } from "vitest"

// Mock implementation for testing Clarity contracts
const mockClarity = () => {
  const admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
  const inspectors = new Map()
  const inspections = new Map()
  
  return {
    // Mock contract state
    state: {
      admin,
      inspectors,
      inspections,
    },
    
    // Mock contract functions
    functions: {
      getInspector: (inspectorId) => {
        return inspectors.get(inspectorId) || null
      },
      
      getInspection: (projectId, inspectionId) => {
        const key = `${projectId}-${inspectionId}`
        return inspections.get(key) || null
      },
      
      isAdmin: (sender) => {
        return sender === admin
      },
      
      isInspector: (sender, inspectorId) => {
        const inspector = inspectors.get(inspectorId)
        return inspector && inspector.principal === sender
      },
      
      registerInspector: (sender, inspectorId, name, organization) => {
        if (inspectors.has(inspectorId)) {
          return { type: "err", value: 101 } // ERR_ALREADY_EXISTS
        }
        
        inspectors.set(inspectorId, {
          principal: sender,
          name,
          organization,
          isVerified: false,
        })
        
        return { type: "ok", value: true }
      },
      
      verifyInspector: (sender, inspectorId) => {
        if (sender !== admin) {
          return { type: "err", value: 100 } // ERR_UNAUTHORIZED
        }
        
        if (!inspectors.has(inspectorId)) {
          return { type: "err", value: 102 } // ERR_NOT_FOUND
        }
        
        const inspector = inspectors.get(inspectorId)
        inspector.isVerified = true
        inspectors.set(inspectorId, inspector)
        
        return { type: "ok", value: true }
      },
      
      scheduleInspection: (sender, projectId, inspectionId, inspectorId, inspectionType, date) => {
        if (!inspectors.has(inspectorId)) {
          return { type: "err", value: 103 } // ERR_INVALID_INSPECTOR
        }
        
        const key = `${projectId}-${inspectionId}`
        inspections.set(key, {
          inspectorId,
          inspectionType,
          date,
          status: "scheduled",
          comments: "",
          passed: false,
        })
        
        return { type: "ok", value: true }
      },
      
      completeInspection: (sender, projectId, inspectionId, comments, passed) => {
        const key = `${projectId}-${inspectionId}`
        
        if (!inspections.has(key)) {
          return { type: "err", value: 102 } // ERR_NOT_FOUND
        }
        
        const inspection = inspections.get(key)
        const inspectorId = inspection.inspectorId
        
        if (!inspectors.has(inspectorId) || inspectors.get(inspectorId).principal !== sender) {
          return { type: "err", value: 100 } // ERR_UNAUTHORIZED
        }
        
        inspection.status = "completed"
        inspection.comments = comments
        inspection.passed = passed
        inspections.set(key, inspection)
        
        return { type: "ok", value: true }
      },
    },
  }
}

describe("Inspection Contract", () => {
  let clarity
  
  beforeEach(() => {
    clarity = mockClarity()
  })
  
  it("should register a new inspector", () => {
    const sender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const inspectorId = "inspector-123"
    const name = "John Doe"
    const organization = "City Building Department"
    
    const result = clarity.functions.registerInspector(sender, inspectorId, name, organization)
    
    expect(result.type).toBe("ok")
    
    const inspector = clarity.functions.getInspector(inspectorId)
    expect(inspector).not.toBeNull()
    expect(inspector.name).toBe(name)
    expect(inspector.organization).toBe(organization)
    expect(inspector.isVerified).toBe(false)
  })
  
  it("should verify an inspector by admin", () => {
    const admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const inspectorId = "inspector-123"
    
    // Register inspector
    clarity.functions.registerInspector(admin, inspectorId, "John Doe", "City Building Department")
    
    // Verify inspector
    const result = clarity.functions.verifyInspector(admin, inspectorId)
    
    expect(result.type).toBe("ok")
    
    const inspector = clarity.functions.getInspector(inspectorId)
    expect(inspector.isVerified).toBe(true)
  })
  
  it("should not verify an inspector by non-admin", () => {
    const admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const nonAdmin = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const inspectorId = "inspector-123"
    
    // Register inspector
    clarity.functions.registerInspector(admin, inspectorId, "John Doe", "City Building Department")
    
    // Try to verify inspector as non-admin
    const result = clarity.functions.verifyInspector(nonAdmin, inspectorId)
    
    expect(result.type).toBe("err")
    expect(result.value).toBe(100) // ERR_UNAUTHORIZED
  })
  
  it("should schedule an inspection", () => {
    const sender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const inspectorId = "inspector-123"
    const projectId = "project-123"
    const inspectionId = "inspection-123"
    const inspectionType = "Structural"
    const date = 1625097600 // Unix timestamp
    
    // Register inspector
    clarity.functions.registerInspector(sender, inspectorId, "John Doe", "City Building Department")
    
    // Schedule inspection
    const result = clarity.functions.scheduleInspection(
        sender,
        projectId,
        inspectionId,
        inspectorId,
        inspectionType,
        date,
    )
    
    expect(result.type).toBe("ok")
    
    const inspection = clarity.functions.getInspection(projectId, inspectionId)
    expect(inspection).not.toBeNull()
    expect(inspection.inspectorId).toBe(inspectorId)
    expect(inspection.inspectionType).toBe(inspectionType)
    expect(inspection.status).toBe("scheduled")
  })
  
  it("should complete an inspection by the assigned inspector", () => {
    const inspector = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const inspectorId = "inspector-123"
    const projectId = "project-123"
    const inspectionId = "inspection-123"
    const comments = "All structural elements meet code requirements"
    const passed = true
    
    // Register inspector
    clarity.functions.registerInspector(inspector, inspectorId, "John Doe", "City Building Department")
    
    // Schedule inspection
    clarity.functions.scheduleInspection(inspector, projectId, inspectionId, inspectorId, "Structural", 1625097600)
    
    // Complete inspection
    const result = clarity.functions.completeInspection(inspector, projectId, inspectionId, comments, passed)
    
    expect(result.type).toBe("ok")
    
    const inspection = clarity.functions.getInspection(projectId, inspectionId)
    expect(inspection.status).toBe("completed")
    expect(inspection.comments).toBe(comments)
    expect(inspection.passed).toBe(passed)
  })
  
  it("should not allow non-assigned inspector to complete an inspection", () => {
    const inspector = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const nonAssignedInspector = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const inspectorId = "inspector-123"
    const projectId = "project-123"
    const inspectionId = "inspection-123"
    
    // Register inspector
    clarity.functions.registerInspector(inspector, inspectorId, "John Doe", "City Building Department")
    
    // Schedule inspection
    clarity.functions.scheduleInspection(inspector, projectId, inspectionId, inspectorId, "Structural", 1625097600)
    
    // Try to complete inspection as non-assigned inspector
    const result = clarity.functions.completeInspection(nonAssignedInspector, projectId, inspectionId, "Comments", true)
    
    expect(result.type).toBe("err")
    expect(result.value).toBe(100) // ERR_UNAUTHORIZED
  })
})
