/**
 * Shared Domain & API Types for Frontend
 */

export type UserRole = 'customer' | 'agent' | 'reviewer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Money {
  amount: number;
  currency: string;
}

export type CustomerTier = 'standard' | 'premium' | 'enterprise';

export interface Customer {
  id: string;
  name: string;
  email: string;
  tier: CustomerTier;
  createdAt: string;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  totalAmount: Money;
  trackingNumber?: string;
  items?: Array<{
    id: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  createdAt: string;
}

export type TransactionType = 'charge' | 'refund' | 'adjustment';

export interface Transaction {
  id: string;
  orderId: string;
  amount: Money;
  type: TransactionType;
  description: string;
  isDuplicate?: boolean;
  createdAt: string;
}

export type CaseStatus =
  | 'open'
  | 'in_progress'
  | 'pending_approval'
  | 'escalated'
  | 'resolved'
  | 'closed';

export type CasePriority = 'low' | 'medium' | 'high' | 'critical';

export interface SupportCase {
  id: string;
  customerId: string;
  subject: string;
  description?: string;
  status: CaseStatus;
  priority: CasePriority;
  assignedAgentId?: string | null;
  assignedAgentName?: string | null;
  resolutionNote?: string | null;
  threadId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RefundStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';

export interface RefundRequest {
  id: string;
  caseId: string;
  customerId: string;
  orderId?: string;
  amount: Money;
  reason: string;
  status: RefundStatus;
  approvedById?: string | null;
  approvalNotes?: string | null;
  rejectionReason?: string | null;
  refundTransactionId?: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface PendingAction {
  action?: string;
  type?: string;
  amount?: number;
  actionParams?: Record<string, any>;
  description?: string;
}

export interface ChatRunResponse {
  threadId: string;
  caseId?: string;
  status: 'completed' | 'pending_approval' | 'processing' | 'error';
  response: string;
  requiresApproval: boolean;
  pendingAction?: PendingAction | null;
  messages?: ChatMessage[];
}

export interface AnalyticsOverview {
  totalCases: number;
  resolvedCases: number;
  pendingApprovals: number;
  avgResolutionTimeMinutes: number;
  csatScore: number;
  refundsProcessedTotal: number;
}

export interface TopicBreakdown {
  topic: string;
  count: number;
  percentage: number;
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  resolvedCount: number;
  avgResponseTimeMinutes: number;
  csatScore: number;
}
