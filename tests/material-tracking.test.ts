import { describe, it, expect, beforeEach } from "vitest"

// Mock implementation for testing Clarity contracts
const mockClarity = () => {
  let admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
  const materials = new Map()
  
  return {
    // Mock contract state
    state: {
      admin,
      materials,
    },
    
    // Mock contract functions
    functions: {
      getMaterial: (projectId, materialId) => {
        const key = `${projectId}-${materialId}`
        return materials.get(key) || null
      },
      
      isAdmin: (sender) => {
        return sender === admin
      },
      
      addMaterial: (sender, projectId, materialId, name, quantity, unit, supplier, deliveryDate) => {
        const key = `${projectId}-${materialId}`
        
        if (materials.has(key)) {
          return { type: "err", value: 101 } // ERR_ALREADY_EXISTS
        }
        
        materials.set(key, {
          name,
          quantity,
          unit,
          supplier,
          deliveryDate,
          status: "ordered",
        })
        
        return { type: "ok", value: true }
      },
      
      updateMaterialStatus: (sender, projectId, materialId, newStatus) => {
        const key = `${projectId}-${materialId}`
        
        if (!materials.has(key)) {
          return { type: "err", value: 102 } // ERR_NOT_FOUND
        }
        
        const material = materials.get(key)
        material.status = newStatus
        materials.set(key, material)
        
        return { type: "ok", value: true }
      },
      
      updateMaterialQuantity: (sender, projectId, materialId, newQuantity) => {
        const key = `${projectId}-${materialId}`
        
        if (!materials.has(key)) {
          return { type: "err", value: 102 } // ERR_NOT_FOUND
        }
        
        const material = materials.get(key)
        material.quantity = newQuantity
        materials.set(key, material)
        
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

describe("Material Tracking Contract", () => {
  let clarity
  
  beforeEach(() => {
    clarity = mockClarity()
  })
  
  it("should add a new material", () => {
    const sender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const projectId = "project-123"
    const materialId = "material-123"
    const name = "Concrete"
    const quantity = 100
    const unit = "kg"
    const supplier = "ABC Suppliers"
    const deliveryDate = 1625097600 // Unix timestamp
    
    const result = clarity.functions.addMaterial(
        sender,
        projectId,
        materialId,
        name,
        quantity,
        unit,
        supplier,
        deliveryDate,
    )
    
    expect(result.type).toBe("ok")
    
    const material = clarity.functions.getMaterial(projectId, materialId)
    expect(material).not.toBeNull()
    expect(material.name).toBe(name)
    expect(material.quantity).toBe(quantity)
    expect(material.status).toBe("ordered")
  })
  
  it("should not add a material with an existing ID", () => {
    const sender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const projectId = "project-123"
    const materialId = "material-123"
    
    // Add material first time
    clarity.functions.addMaterial(sender, projectId, materialId, "Concrete", 100, "kg", "ABC Suppliers", 1625097600)
    
    // Try to add again with same ID
    const result = clarity.functions.addMaterial(
        sender,
        projectId,
        materialId,
        "Steel",
        200,
        "kg",
        "XYZ Suppliers",
        1625184000,
    )
    
    expect(result.type).toBe("err")
    expect(result.value).toBe(101) // ERR_ALREADY_EXISTS
  })
  
  it("should update material status", () => {
    const sender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const projectId = "project-123"
    const materialId = "material-123"
    const newStatus = "delivered"
    
    // Add material
    clarity.functions.addMaterial(sender, projectId, materialId, "Concrete", 100, "kg", "ABC Suppliers", 1625097600)
    
    // Update status
    const result = clarity.functions.updateMaterialStatus(sender, projectId, materialId, newStatus)
    
    expect(result.type).toBe("ok")
    
    const material = clarity.functions.getMaterial(projectId, materialId)
    expect(material.status).toBe(newStatus)
  })
  
  it("should update material quantity", () => {
    const sender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const projectId = "project-123"
    const materialId = "material-123"
    const newQuantity = 150
    
    // Add material
    clarity.functions.addMaterial(sender, projectId, materialId, "Concrete", 100, "kg", "ABC Suppliers", 1625097600)
    
    // Update quantity
    const result = clarity.functions.updateMaterialQuantity(sender, projectId, materialId, newQuantity)
    
    expect(result.type).toBe("ok")
    
    const material = clarity.functions.getMaterial(projectId, materialId)
    expect(material.quantity).toBe(newQuantity)
  })
  
  it("should not update non-existent material", () => {
    const sender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const projectId = "project-123"
    const nonExistentMaterialId = "material-456"
    
    // Try to update status of non-existent material
    const result = clarity.functions.updateMaterialStatus(sender, projectId, nonExistentMaterialId, "delivered")
    
    expect(result.type).toBe("err")
    expect(result.value).toBe(102) // ERR_NOT_FOUND
  })
})
