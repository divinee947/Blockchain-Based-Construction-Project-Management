import { describe, it, expect, beforeEach } from "vitest"

// Mock implementation for testing Clarity contracts
const mockClarity = () => {
  const admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
  const projects = new Map()
  const milestones = new Map()
  
  return {
    // Mock contract state
    state: {
      admin,
      projects,
      milestones,
    },
    
    // Mock contract functions
    functions: {
      getProject: (projectId) => {
        return projects.get(projectId) || null
      },
      
      getMilestone: (projectId, milestoneId) => {
        const key = `${projectId}-${milestoneId}`
        return milestones.get(key) || null
      },
      
      isAdmin: (sender) => {
        return sender === admin
      },
      
      isProjectOwner: (sender, projectId) => {
        const project = projects.get(projectId)
        return project && project.owner === sender
      },
      
      isProjectContractor: (sender, projectId) => {
        const project = projects.get(projectId)
        return project && project.contractor === sender
      },
      
      createProject: (sender, projectId, name, contractor, startDate, endDate) => {
        if (projects.has(projectId)) {
          return { type: "err", value: 101 } // ERR_ALREADY_EXISTS
        }
        
        projects.set(projectId, {
          name,
          owner: sender,
          contractor,
          startDate,
          endDate,
          status: "active",
        })
        
        return { type: "ok", value: true }
      },
      
      addMilestone: (sender, projectId, milestoneId, name, description, deadline, paymentPercentage) => {
        if (!projects.has(projectId)) {
          return { type: "err", value: 103 } // ERR_INVALID_PROJECT
        }
        
        const project = projects.get(projectId)
        if (sender !== project.owner && sender !== admin) {
          return { type: "err", value: 100 } // ERR_UNAUTHORIZED
        }
        
        if (paymentPercentage > 100) {
          return { type: "err", value: 104 } // Payment percentage must be between 0-100
        }
        
        const key = `${projectId}-${milestoneId}`
        milestones.set(key, {
          name,
          description,
          deadline,
          completed: false,
          verified: false,
          paymentPercentage,
        })
        
        return { type: "ok", value: true }
      },
      
      markMilestoneCompleted: (sender, projectId, milestoneId) => {
        if (!projects.has(projectId)) {
          return { type: "err", value: 103 } // ERR_INVALID_PROJECT
        }
        
        const project = projects.get(projectId)
        if (sender !== project.contractor) {
          return { type: "err", value: 100 } // ERR_UNAUTHORIZED
        }
        
        const key = `${projectId}-${milestoneId}`
        if (!milestones.has(key)) {
          return { type: "err", value: 102 } // ERR_NOT_FOUND
        }
        
        const milestone = milestones.get(key)
        milestone.completed = true
        milestones.set(key, milestone)
        
        return { type: "ok", value: true }
      },
      
      verifyMilestone: (sender, projectId, milestoneId) => {
        if (!projects.has(projectId)) {
          return { type: "err", value: 103 } // ERR_INVALID_PROJECT
        }
        
        const project = projects.get(projectId)
        if (sender !== project.owner && sender !== admin) {
          return { type: "err", value: 100 } // ERR_UNAUTHORIZED
        }
        
        const key = `${projectId}-${milestoneId}`
        if (!milestones.has(key)) {
          return { type: "err", value: 102 } // ERR_NOT_FOUND
        }
        
        const milestone = milestones.get(key)
        milestone.verified = true
        milestones.set(key, milestone)
        
        return { type: "ok", value: true }
      },
      
      updateProjectStatus: (sender, projectId, newStatus) => {
        if (!projects.has(projectId)) {
          return { type: "err", value: 102 } // ERR_NOT_FOUND
        }
        
        const project = projects.get(projectId)
        if (sender !== project.owner && sender !== admin) {
          return { type: "err", value: 100 } // ERR_UNAUTHORIZED
        }
        
        project.status = newStatus
        projects.set(projectId, project)
        
        return { type: "ok", value: true }
      },
    },
  }
}

describe("Milestone Verification Contract", () => {
  let clarity
  
  beforeEach(() => {
    clarity = mockClarity()
  })
  
  it("should create a new project", () => {
    const owner = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const contractor = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const projectId = "project-123"
    const name = "Office Building"
    const startDate = 1625097600 // Unix timestamp
    const endDate = 1640995200 // Unix timestamp
    
    const result = clarity.functions.createProject(owner, projectId, name, contractor, startDate, endDate)
    
    expect(result.type).toBe("ok")
    
    const project = clarity.functions.getProject(projectId)
    expect(project).not.toBeNull()
    expect(project.name).toBe(name)
    expect(project.owner).toBe(owner)
    expect(project.contractor).toBe(contractor)
    expect(project.status).toBe("active")
  })
  
  it("should add a milestone to a project", () => {
    const owner = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const contractor = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const projectId = "project-123"
    const milestoneId = "milestone-123"
    
    // Create project
    clarity.functions.createProject(owner, projectId, "Office Building", contractor, 1625097600, 1640995200)
    
    // Add milestone
    const result = clarity.functions.addMilestone(
        owner,
        projectId,
        milestoneId,
        "Foundation",
        "Complete the foundation work",
        1627776000,
        20,
    )
    
    expect(result.type).toBe("ok")
    
    const milestone = clarity.functions.getMilestone(projectId, milestoneId)
    expect(milestone).not.toBeNull()
    expect(milestone.name).toBe("Foundation")
    expect(milestone.completed).toBe(false)
    expect(milestone.verified).toBe(false)
    expect(milestone.paymentPercentage).toBe(20)
  })
  
  it("should mark a milestone as completed by contractor", () => {
    const owner = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const contractor = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const projectId = "project-123"
    const milestoneId = "milestone-123"
    
    // Create project
    clarity.functions.createProject(owner, projectId, "Office Building", contractor, 1625097600, 1640995200)
    
    // Add milestone
    clarity.functions.addMilestone(
        owner,
        projectId,
        milestoneId,
        "Foundation",
        "Complete the foundation work",
        1627776000,
        20,
    )
    
    // Mark milestone as completed
    const result = clarity.functions.markMilestoneCompleted(contractor, projectId, milestoneId)
    
    expect(result.type).toBe("ok")
    
    const milestone = clarity.functions.getMilestone(projectId, milestoneId)
    expect(milestone.completed).toBe(true)
    expect(milestone.verified).toBe(false)
  })
  
  it("should verify a completed milestone by owner", () => {
    const owner = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const contractor = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const projectId = "project-123"
    const milestoneId = "milestone-123"
    
    // Create project
    clarity.functions.createProject(owner, projectId, "Office Building", contractor, 1625097600, 1640995200)
    
    // Add milestone
    clarity.functions.addMilestone(
        owner,
        projectId,
        milestoneId,
        "Foundation",
        "Complete the foundation work",
        1627776000,
        20,
    )
    
    // Mark milestone as completed
    clarity.functions.markMilestoneCompleted(contractor, projectId, milestoneId)
    
    // Verify milestone
    const result = clarity.functions.verifyMilestone(owner, projectId, milestoneId)
    
    expect(result.type).toBe("ok")
    
    const milestone = clarity.functions.getMilestone(projectId, milestoneId)
    expect(milestone.completed).toBe(true)
    expect(milestone.verified).toBe(true)
  })
  
  it("should not allow non-contractor to mark milestone as completed", () => {
    const owner = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const contractor = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const nonContractor = "ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const projectId = "project-123"
    const milestoneId = "milestone-123"
    
    // Create project
    clarity.functions.createProject(owner, projectId, "Office Building", contractor, 1625097600, 1640995200)
    
    // Add milestone
    clarity.functions.addMilestone(
        owner,
        projectId,
        milestoneId,
        "Foundation",
        "Complete the foundation work",
        1627776000,
        20,
    )
    
    // Try to mark milestone as completed by non-contractor
    const result = clarity.functions.markMilestoneCompleted(nonContractor, projectId, milestoneId)
    
    expect(result.type).toBe("err")
    expect(result.value).toBe(100) // ERR_UNAUTHORIZED
  })
  
  it("should update project status", () => {
    const owner = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const contractor = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const projectId = "project-123"
    const newStatus = "completed"
    
    // Create project
    clarity.functions.createProject(owner, projectId, "Office Building", contractor, 1625097600, 1640995200)
    
    // Update project status
    const result = clarity.functions.updateProjectStatus(owner, projectId, newStatus)
    
    expect(result.type).toBe("ok")
    
    const project = clarity.functions.getProject(projectId)
    expect(project.status).toBe(newStatus)
  })
})
