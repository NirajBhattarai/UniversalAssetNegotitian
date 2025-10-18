export interface Message {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: Date
}

export interface NegotiationStep {
  id: string
  message: string
  timestamp: Date
  status: string
}

export interface AssetNegotiationResult {
  negotiationId: string
  assetType: string
  finalPrice: number
  currency: string
  paymentMethod: string
  verificationStatus: 'verified' | 'pending' | 'failed'
  complianceStatus: 'compliant' | 'pending' | 'non_compliant'
  settlementStatus: 'pending' | 'processing' | 'completed' | 'failed'
  timestamp: string
}

export interface AgentEvent {
  kind: 'status-update' | 'artifact-update' | 'message' | 'task'
  taskId?: string
  contextId?: string
  status?: {
    state: string
    message?: {
      parts: Array<{
        kind: string
        text?: string
      }>
    }
  }
  artifact?: {
    name: string
    parts: Array<{
      kind: string
      data?: any
    }>
  }
}
