export type EventStatus = 'Quotation' | 'Confirmed' | 'Shooting' | 'Editing' | 'Delivered' | 'Cancelled';
export type EventType = 'Wedding' | 'Pre-Wedding' | 'Birthday' | 'Corporate' | 'Product' | 'Portrait' | 'Other';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'On Hold';
export type TaskType = 'Photography' | 'Videography' | 'Photo Editing' | 'Video Editing' | 'Delivery' | 'Client Meeting' | 'Other';
export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Card' | 'Cheque';
export type PaymentStatus = 'Pending' | 'Paid' | 'Partial' | 'Overdue';
export type ExpenseCategory = 'Equipment' | 'Travel' | 'Accommodation' | 'Food' | 'Marketing' | 'Software' | 'Maintenance' | 'Salary' | 'Other';
export type NotificationType = 'Task_Assigned' | 'Task_Updated' | 'Payment_Received' | 'Event_Updated' | 'Deadline_Reminder' | 'System_Alert';

export interface Client {
  id: string;
  firm_id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  firm_id: string;
  client_id: string;
  title: string;
  event_type: EventType;
  event_date: string;
  venue?: string;
  description?: string;
  status: EventStatus;
  total_amount: number;
  advance_amount: number;
  balance_amount: number;
  photographer_id?: string;
  videographer_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  client?: Client;
  photographer?: any;
  videographer?: any;
  tasks?: Task[];
  payments?: Payment[];
}

export interface Quotation {
  id: string;
  firm_id: string;
  client_id: string;
  title: string;
  event_type: EventType;
  event_date: string;
  venue?: string;
  description?: string;
  amount: number;
  valid_until?: string;
  created_by?: string;
  converted_to_event?: string;
  created_at: string;
  updated_at: string;
  // Relations
  client?: Client;
  event?: Event;
}

export interface Task {
  id: string;
  firm_id: string;
  event_id: string;
  assigned_to?: string;
  title: string;
  description?: string;
  task_type: TaskType;
  status: TaskStatus;
  priority: number;
  due_date?: string;
  completed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  event?: Event;
  assigned_staff?: any;
}

export interface Payment {
  id: string;
  firm_id: string;
  event_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference_number?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  event?: Event;
}

export interface Expense {
  id: string;
  firm_id: string;
  event_id?: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  expense_date: string;
  receipt_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  event?: Event;
}

export interface StaffPayment {
  id: string;
  firm_id: string;
  staff_id: string;
  event_id?: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  staff?: any;
  event?: Event;
}

export interface Notification {
  id: string;
  firm_id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  related_id?: string;
  created_at: string;
}

// Import existing types
export type { UserRole, Profile, Firm, AuthFormData } from './auth';

// Dashboard Analytics Types
export interface DashboardStats {
  totalRevenue: number;
  pendingAmount: number;
  totalExpenses: number;
  activeEvents: number;
  pendingTasks: number;
  completedEvents: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
}

export interface RevenueChart {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface TaskProgress {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

// Form Types
export interface EventFormData {
  title: string;
  client_id: string;
  event_type: EventType;
  event_date: string;
  venue?: string;
  description?: string;
  total_amount: number;
  photographer_id?: string;
  videographer_id?: string;
}

export interface ClientFormData {
  name: string;
  email?: string;
  phone: string;
  address?: string;
  notes?: string;
}

export interface TaskFormData {
  title: string;
  description?: string;
  task_type: TaskType;
  assigned_to?: string;
  due_date?: string;
  priority: number;
}

export interface PaymentFormData {
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference_number?: string;
  notes?: string;
}

export interface ExpenseFormData {
  category: ExpenseCategory;
  amount: number;
  description: string;
  expense_date: string;
  event_id?: string;
}