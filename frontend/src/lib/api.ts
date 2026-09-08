function getApiBaseUrl(): string {
  // 1. Explicit env variable
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  // 2. Production fallback if on Railway domain
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.includes("railway.app") || host.includes("up.railway.app")) {
      return "https://absolutracker-production.up.railway.app";
    }
  }
  return "http://localhost:8000";
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path}`;
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(err.detail || `Server returned status ${res.status}`);
    }
    return res.json();
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        throw new Error(`Cannot connect to backend at ${baseUrl}. Please check network connection.`);
      }
      throw err;
    }
    throw new Error("An unexpected network error occurred");
  }
}


// ── Auth ──
export interface LoginResponse {
  success: boolean;
  username: string;
  message: string;
}

export function login(username: string, password: string) {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

// ── Orders ──
export interface Order {
  id: number;
  customer_name: string;
  phone: string;
  item_desc: string;
  qty: number;
  price: number;
  stage: number;
  deadline: string;
  payment_status: string;
  created_at: string | null;
}

export interface OrderCreate {
  customer_name: string;
  phone?: string;
  item_desc: string;
  qty?: number;
  price?: number;
  deadline?: string;
  stage?: number;
  payment_status?: string;
}

export type OrderUpdate = Partial<OrderCreate>;

export function getOrders() {
  return request<Order[]>("/orders");
}

export function createOrder(data: OrderCreate) {
  return request<Order>("/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateOrder(id: number, data: OrderUpdate) {
  return request<Order>(`/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function advanceStage(id: number) {
  return request<Order>(`/orders/${id}/stage`, { method: "PATCH" });
}

export function revertStage(id: number) {
  return request<Order>(`/orders/${id}/revert`, { method: "PATCH" });
}

export function completeOrder(id: number) {
  console.log("called this")
  return request<CompletedOrder>(`/orders/${id}/complete`, { method: "POST" });
}

export function deleteOrder(id: number) {
  return request<{ detail: string }>(`/orders/${id}`, { method: "DELETE" });
}

// ── Completed Orders ──
export interface CompletedOrder {
  id: number;
  customer_name: string;
  phone: string;
  item_desc: string;
  qty: number;
  price: number;
  deadline: string;
  payment_status: string;
  created_at: string | null;
  completed_at: string | null;
}

export type CompletedOrderUpdate = Partial<{
  customer_name: string;
  phone: string;
  item_desc: string;
  qty: number;
  price: number;
  deadline: string;
  payment_status: string;
}>;

export function getCompleted() {
  return request<CompletedOrder[]>("/completed");
}

export function updateCompletedOrder(id: number, data: CompletedOrderUpdate) {
  return request<CompletedOrder>(`/completed/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteCompletedOrder(id: number) {
  return request<{ detail: string }>(`/completed/${id}`, { method: "DELETE" });
}

// ── Waiting List ──
export interface WaitingItem {
  id: number;
  customer_name: string;
  phone: string;
  item_desc: string;
  notes: string;
  created_at: string | null;
}

export interface WaitingCreate {
  customer_name: string;
  phone?: string;
  item_desc: string;
  notes?: string;
}

export type WaitingUpdate = Partial<WaitingCreate>;

export function getWaiting() {
  return request<WaitingItem[]>("/waiting");
}

export function addWaiting(data: WaitingCreate) {
  return request<WaitingItem>("/waiting", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateWaiting(id: number, data: WaitingUpdate) {
  return request<WaitingItem>(`/waiting/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteWaiting(id: number) {
  return request<{ detail: string }>(`/waiting/${id}`, { method: "DELETE" });
}

export function promoteWaiting(id: number) {
  return request<Order>(`/waiting/${id}/promote`, { method: "POST" });
}

// ── Todo List (Items / Missing Features / Tasks) ──
export interface TodoItem {
  id: number;
  title: string;
  category: string;
  priority: "low" | "medium" | "high" | string;
  is_done: number; // 0 or 1
  notes: string;
  created_at: string | null;
}

export interface TodoCreate {
  title: string;
  category?: string;
  priority?: string;
  notes?: string;
}

export type TodoUpdate = Partial<{
  title: string;
  category: string;
  priority: string;
  is_done: number;
  notes: string;
}>;

export function getTodos() {
  return request<TodoItem[]>("/todos");
}

export function addTodo(data: TodoCreate) {
  return request<TodoItem>("/todos", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTodo(id: number, data: TodoUpdate) {
  return request<TodoItem>(`/todos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function toggleTodo(id: number) {
  return request<TodoItem>(`/todos/${id}/toggle`, { method: "PATCH" });
}

export function deleteTodo(id: number) {
  return request<{ detail: string }>(`/todos/${id}`, { method: "DELETE" });
}

// ── Expenses ──
export interface Expense {
  id: number;
  amount: number;
  category: string;
  date: string;
  notes: string;
  created_at: string | null;
}

export interface ExpenseCreate {
  amount: number;
  category: string;
  date: string;
  notes?: string;
}

export type ExpenseUpdate = Partial<ExpenseCreate>;

export function getExpenses() {
  return request<Expense[]>("/expenses");
}

export function addExpense(data: ExpenseCreate) {
  return request<Expense>("/expenses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateExpense(id: number, data: ExpenseUpdate) {
  return request<Expense>(`/expenses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteExpense(id: number) {
  return request<{ detail: string }>(`/expenses/${id}`, { method: "DELETE" });
}

// ── Dashboard ──
export interface DashboardStats {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  completed_count: number;
  avg_margin: number;
}

export function getDashboardStats() {
  return request<DashboardStats>("/dashboard/stats");
}

// ── Calculator Formula Config ──
export interface FormulaConfig {
  filament_cost_per_g: number;
  machine_hourly_rate: number;
  electricity_hourly_rate: number;
  failure_margin_pct: number;
  markup_multiplier: number;
  purge_waste_grams_per_color: number;
  color_swap_fee: number;
  color_swap_time_pct: number;
}

export function getFormulaConfig() {
  return request<FormulaConfig>("/calculator/config");
}

export function saveFormulaConfig(data: FormulaConfig) {
  return request<FormulaConfig>("/calculator/config", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Products Catalog ──
export interface Product {
  id: number;
  name: string;
  price: number;
  created_at: string | null;
}

export interface ProductCreate {
  name: string;
  price: number;
}

export type ProductUpdate = Partial<ProductCreate>;

export function getProducts() {
  return request<Product[]>("/products");
}

export function createProduct(data: ProductCreate) {
  return request<Product>("/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateProduct(id: number, data: ProductUpdate) {
  return request<Product>(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteProduct(id: number) {
  return request<{ detail: string }>(`/products/${id}`, { method: "DELETE" });
}

// ── Filament Inventory ──
export interface FilamentSpool {
  id: number;
  name: string;
  material: string;
  color_name: string;
  color_hex: string;
  remaining_grams: number;
  total_grams: number;
  cost_per_kg: number;
  created_at: string | null;
}

export interface FilamentCreate {
  name: string;
  material?: string;
  color_name?: string;
  color_hex?: string;
  remaining_grams?: number;
  total_grams?: number;
  cost_per_kg?: number;
}

export type FilamentUpdate = Partial<FilamentCreate>;

export function getFilaments() {
  return request<FilamentSpool[]>("/filaments");
}

export function createFilament(data: FilamentCreate) {
  return request<FilamentSpool>("/filaments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateFilament(id: number, data: FilamentUpdate) {
  return request<FilamentSpool>(`/filaments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deductFilament(id: number, grams: number, reason = "Usage / Waste") {
  return request<FilamentSpool>(`/filaments/${id}/deduct`, {
    method: "POST",
    body: JSON.stringify({ grams, reason }),
  });
}

export function deleteFilament(id: number) {
  return request<{ detail: string }>(`/filaments/${id}`, { method: "DELETE" });
}

