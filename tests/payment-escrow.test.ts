import { describe, it, expect, beforeEach } from "vitest"

// Mock implementation for testing Clarity contracts
const mockClarity = () => {
  const admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
  const escrows = new Map()
  const payments = new Map()
  const blockHeight = 100
  
  return {
    // Mock contract state
    state: {
      admin,
      escrows,
      payments,
      blockHeight,
    },
    
    // Mock contract functions
    functions: {
      getEscrow: (escrowId) => {
        return escrows.get(escrowId) || null
      },
      
      getPayment: (escrowId, paymentId) => {
        const key = `${escrowId}-${paymentId}`
        return payments.get(key) || null
      },
      
      isAdmin: (sender) => {
        return sender === admin
      },
      
      isEscrowClient: (sender, escrowId) => {
        const escrow = escrows.get(escrowId)
        return escrow && escrow.client === sender
      },
      
      isEscrowContractor: (sender, escrowId) => {
        const escrow = escrows.get(escrowId)
        return escrow && escrow.contractor === sender
      },
      
      createEscrow: (sender, escrowId, projectId, contractor, totalAmount) => {
        if (escrows.has(escrowId)) {
          return { type: "err", value: 101 } // ERR_ALREADY_EXISTS
        }
        
        escrows.set(escrowId, {
          projectId,
          client: sender,
          contractor,
          totalAmount,
          releasedAmount: 0,
          status: "active",
        })
        
        return { type: "ok", value: true }
      },
      
      addPayment: (sender, escrowId, paymentId, milestoneId, amount) => {
        if (!escrows.has(escrowId)) {
          return { type: "err", value: 102 } // ERR_NOT_FOUND
        }
        
        const escrow = escrows.get(escrowId)
        
        if (sender !== escrow.client && sender !== admin) {
          return { type: "err", value: 100 } // ERR_UNAUTHORIZED
        }
        
        if (escrow.status !== "active") {
          return { type: "err", value: 104 } // ERR_INVALID_STATE
        }
        
        const key = `${escrowId}-${paymentId}`
        payments.set(key, {
          milestoneId,
          amount,
          status: "pending",
          releaseDate: 0,
        })
        
        return { type: "ok", value: true }
      },
      
      releasePayment: (sender, escrowId, paymentId) => {
        if (!escrows.has(escrowId)) {
          return { type: "err", value: 102 } // ERR_NOT_FOUND
        }
        
        const escrow = escrows.get(escrowId)
        
        if (sender !== escrow.client && sender !== admin) {
          return { type: "err", value: 100 } // ERR_UNAUTHORIZED
        }
        
        if (escrow.status !== "active") {
          return { type: "err", value: 104 } // ERR_INVALID_STATE
        }
        
        const key = `${escrowId}-${paymentId}`
        
        if (!payments.has(key)) {
          return { type: "err", value: 102 } // ERR_NOT_FOUND
        }
        
        const payment = payments.get(key)
        
        if (payment.status !== "pending") {
          return { type: "err", value: 104 } // ERR_INVALID_STATE
        }
        
        // Update payment
        payment.status = "released"
        payment.releaseDate = blockHeight
        payments.set(key, payment)
        
        // Update escrow
        escrow.releasedAmount += payment.amount
        escrows.set(escrowId, escrow)
        
        return { type: "ok", value: true }
      },
      
      closeEscrow: (sender, escrowId) => {
        if (!escrows.has(escrowId)) {
          return { type: "err", value: 102 } // ERR_NOT_FOUND
        }
        
        const escrow = escrows.get(escrowId)
        
        if (sender !== escrow.client && sender !== admin) {
          return { type: "err", value: 100 } // ERR_UNAUTHORIZED
        }
        
        if (escrow.status !== "active") {
          return { type: "err", value: 104 } // ERR_INVALID_STATE
        }
        
        escrow.status = "closed"
        escrows.set(escrowId, escrow)
        
        return { type: "ok", value: true }
      },
      
      disputeEscrow: (sender, escrowId) => {
        if (!escrows.has(escrowId)) {
          return { type: "err", value: 102 } // ERR_NOT_FOUND
        }
        
        const escrow = escrows.get(escrowId)
        
        if (sender !== escrow.client && sender !== escrow.contractor) {
          return { type: "err", value: 100 } // ERR_UNAUTHORIZED
        }
        
        if (escrow.status !== "active") {
          return { type: "err", value: 104 } // ERR_INVALID_STATE
        }
        
        escrow.status = "disputed"
        escrows.set(escrowId, escrow)
        
        return { type: "ok", value: true }
      },
      
      resolveDispute: (sender, escrowId, newStatus) => {
        if (!escrows.has(escrowId)) {
          return { type: "err", value: 102 } // ERR_NOT_FOUND
        }
        
        if (sender !== admin) {
          return { type: "err", value: 100 } // ERR_UNAUTHORIZED
        }
        
        const escrow = escrows.get(escrowId)
        
        if (escrow.status !== "disputed") {
          return { type: "err", value: 104 } // ERR_INVALID_STATE
        }
        
        escrow.status = newStatus
        escrows.set(escrowId, escrow)
        
        return { type: "ok", value: true }
      },
    },
  }
}

describe("Payment Escrow Contract", () => {
  let clarity
  
  beforeEach(() => {
    clarity = mockClarity()
  })
  
  it("should create a new escrow", () => {
    const client = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const contractor = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const escrowId = "escrow-123"
    const projectId = "project-123"
    const totalAmount = 100000
    
    const result = clarity.functions.createEscrow(client, escrowId, projectId, contractor, totalAmount)
    
    expect(result.type).toBe("ok")
    
    const escrow = clarity.functions.getEscrow(escrowId)
    expect(escrow).not.toBeNull()
    expect(escrow.projectId).toBe(projectId)
    expect(escrow.client).toBe(client)
    expect(escrow.contractor).toBe(contractor)
    expect(escrow.totalAmount).toBe(totalAmount)
    expect(escrow.releasedAmount).toBe(0)
    expect(escrow.status).toBe("active")
  })
  
  it("should add a payment to an escrow", () => {
    const client = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const contractor = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const escrowId = "escrow-123"
    const paymentId = "payment-123"
    const milestoneId = "milestone-123"
    const amount = 20000
    
    // Create escrow
    clarity.functions.createEscrow(client, escrowId, "project-123", contractor, 100000)
    
    // Add payment
    const result = clarity.functions.addPayment(client, escrowId, paymentId, milestoneId, amount)
    
    expect(result.type).toBe("ok")
    
    const payment = clarity.functions.getPayment(escrowId, paymentId)
    expect(payment).not.toBeNull()
    expect(payment.milestoneId).toBe(milestoneId)
    expect(payment.amount).toBe(amount)
    expect(payment.status).toBe("pending")
  })
  
  it("should release a payment", () => {
    const client = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const contractor = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const escrowId = "escrow-123"
    const paymentId = "payment-123"
    const amount = 20000
    
    // Create escrow
    clarity.functions.createEscrow(client, escrowId, "project-123", contractor, 100000)
    
    // Add payment
    clarity.functions.addPayment(client, escrowId, paymentId, "milestone-123", amount)
    
    // Release payment
    const result = clarity.functions.releasePayment(client, escrowId, paymentId)
    
    expect(result.type).toBe("ok")
    
    const payment = clarity.functions.getPayment(escrowId, paymentId)
    expect(payment.status).toBe("released")
    expect(payment.releaseDate).toBe(clarity.state.blockHeight)
    
    const escrow = clarity.functions.getEscrow(escrowId)
    expect(escrow.releasedAmount).toBe(amount)
  })
  
  it("should not allow contractor to release payment", () => {
    const client = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const contractor = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const escrowId = "escrow-123"
    const paymentId = "payment-123"
    
    // Create escrow
    clarity.functions.createEscrow(client, escrowId, "project-123", contractor, 100000)
    
    // Add payment
    clarity.functions.addPayment(client, escrowId, paymentId, "milestone-123", 20000)
    
    // Try to release payment as contractor
    const result = clarity.functions.releasePayment(contractor, escrowId, paymentId)
    
    expect(result.type).toBe("err")
    expect(result.value).toBe(100) // ERR_UNAUTHORIZED
  })
  
  it("should close an escrow", () => {
    const client = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const contractor = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const escrowId = "escrow-123"
    
    // Create escrow
    clarity.functions.createEscrow(client, escrowId, "project-123", contractor, 100000)
    
    // Close escrow
    const result = clarity.functions.closeEscrow(client, escrowId)
    
    expect(result.type).toBe("ok")
    
    const escrow = clarity.functions.getEscrow(escrowId)
    expect(escrow.status).toBe("closed")
  })
  
  it("should dispute an escrow by client or contractor", () => {
    const client = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const contractor = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const escrowId = "escrow-123"
    
    // Create escrow
    clarity.functions.createEscrow(client, escrowId, "project-123", contractor, 100000)
    
    // Dispute escrow as contractor
    const result = clarity.functions.disputeEscrow(contractor, escrowId)
    
    expect(result.type).toBe("ok")
    
    const escrow = clarity.functions.getEscrow(escrowId)
    expect(escrow.status).toBe("disputed")
  })
  
  it("should resolve a disputed escrow by admin", () => {
    const client = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const contractor = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const escrowId = "escrow-123"
    const newStatus = "active"
    
    // Create escrow
    clarity.functions.createEscrow(client, escrowId, "project-123", contractor, 100000)
    
    // Dispute escrow
    clarity.functions.disputeEscrow(contractor, escrowId)
    
    // Resolve dispute
    const result = clarity.functions.resolveDispute(admin, escrowId, newStatus)
    
    expect(result.type).toBe("ok")
    
    const escrow = clarity.functions.getEscrow(escrowId)
    expect(escrow.status).toBe(newStatus)
  })
})
