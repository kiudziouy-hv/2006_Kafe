import { http } from '@/lib/http'

export interface Ingredient {
  id: number
  name: string
  unit: string
  minStock: number
  currentStock: number
  availableStock: number
  trackExpiry: boolean
  low: number | boolean
}

export interface IngredientInput {
  name: string
  unit: string
  minStock: number
  trackExpiry: boolean
}

export interface RecipeTarget {
  kind: 'ITEM' | 'TOPPING'
  itemId: number | null
  size: string | null
  toppingId: number | null
  name: string
  lineCount: number
}

export interface RecipeLine {
  ingredientId: number
  name?: string
  unit?: string
  quantity: number
}

export interface ReceiptLineInput {
  ingredientId: number
  quantity: number
  expiryDate?: string
}

export interface Receipt {
  id: number
  ingredient: string
  unit: string
  quantity: number
  receivedAt: string
  expiryDate: string | null
}

export interface Adjustment {
  id: number
  ingredient: string
  unit: string
  quantityBefore: number
  quantityAfter: number
  reason: string
  adjustedAt: string
  adjustedBy: string
}

export interface Waste {
  id: number
  ingredientId: number
  ingredient: string
  unit: string
  quantity: number
  reason: string
  status: 'PROPOSED' | 'CONFIRMED' | 'REJECTED'
  createdAt: string
  createdBy: string
  confirmedAt: string | null
  confirmedBy: string | null
}

export interface Alerts {
  lowStock: { id: number; name: string; unit: string; currentStock: number; minStock: number }[]
  expiring: {
    id: number
    ingredient: string
    expiryDate: string
    daysLeft: number
    quantityToCheck: number
  }[]
}

const target = (t: Pick<RecipeTarget, 'itemId' | 'size' | 'toppingId'>) =>
  t.toppingId !== null ? { toppingId: t.toppingId } : { itemId: t.itemId, size: t.size }

export const inventoryApi = {
  ingredients: () => http.get<Ingredient[]>('/inventory/ingredients').then((r) => r.data),
  createIngredient: (b: IngredientInput) =>
    http.post<Ingredient>('/inventory/ingredients', b).then((r) => r.data),
  updateIngredient: (id: number, b: IngredientInput) =>
    http.put<Ingredient>(`/inventory/ingredients/${id}`, b).then((r) => r.data),
  recipeTargets: () => http.get<RecipeTarget[]>('/inventory/recipes').then((r) => r.data),
  recipe: (t: RecipeTarget) =>
    http.get<RecipeLine[]>('/inventory/recipe', { params: target(t) }).then((r) => r.data),
  saveRecipe: (t: RecipeTarget, lines: RecipeLine[]) =>
    http
      .put<RecipeLine[]>('/inventory/recipe', {
        ...target(t),
        lines: lines.map((l) => ({ ingredientId: l.ingredientId, quantity: l.quantity })),
      })
      .then((r) => r.data),
  receipts: () => http.get<Receipt[]>('/inventory/receipts').then((r) => r.data),
  receive: (lines: ReceiptLineInput[]) =>
    http.post<{ resold: number }>('/inventory/receipts', { lines }).then((r) => r.data),
  adjustments: () => http.get<Adjustment[]>('/inventory/adjustments').then((r) => r.data),
  adjust: (b: { ingredientId: number; actual: number; reason: string }) =>
    http.post<Ingredient>('/inventory/adjustments', b).then((r) => r.data),
  waste: (status?: string) =>
    http.get<Waste[]>('/inventory/waste', { params: { status } }).then((r) => r.data),
  proposeWaste: (b: { ingredientId: number; quantity: number; reason: string }) =>
    http.post<Waste>('/inventory/waste', b).then((r) => r.data),
  decideWaste: (id: number, confirm: boolean) =>
    http
      .post<Waste>(`/inventory/waste/${id}/${confirm ? 'confirm' : 'reject'}`)
      .then((r) => r.data),
  alerts: () => http.get<Alerts>('/inventory/alerts').then((r) => r.data),
}

export const num = (n: number) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(n)
