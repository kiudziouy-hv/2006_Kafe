import { http } from '@/lib/http'

export type CatalogStatus = 'SELLING' | 'OUT_OF_STOCK' | 'STOPPED'
export type ItemGroup = 'COFFEE' | 'TEA' | 'SMOOTHIE' | 'CAKE'

export interface AdminSize {
  size: 'M' | 'L'
  price: number
  status: CatalogStatus
  statusSource: 'SYSTEM' | 'OWNER_MANAGER' | null
}

export interface AdminItem {
  id: number
  name: string
  group: ItemGroup
  status: CatalogStatus
  allowHot: boolean
  allowCold: boolean
  sizes: AdminSize[]
  toppingIds: number[]
  imageUrl: string | null
}

export interface AdminTopping {
  id: number
  name: string
  surcharge: number
  status: CatalogStatus
  statusSource: 'SYSTEM' | 'OWNER_MANAGER' | null
  itemIds: number[]
  imageUrl: string | null
}

export interface ItemInput {
  name: string
  group: ItemGroup
  allowHot: boolean
  allowCold: boolean
  sizes: { size: 'M' | 'L'; price: number }[]
  toppingIds: number[]
}

export interface ToppingInput {
  name: string
  surcharge: number
  itemIds: number[]
}

export interface Promotion {
  id: number
  name: string
  group: ItemGroup
  discountPercent: number
  startDate: string | null
  endDate: string | null
  dailyStart: string
  dailyEnd: string
  active: boolean
}

export type PromotionInput = Omit<Promotion, 'id' | 'active'>

export const menuApi = {
  items: () => http.get<AdminItem[]>('/admin/items').then((r) => r.data),
  createItem: (b: ItemInput) => http.post<AdminItem>('/admin/items', b).then((r) => r.data),
  updateItem: (id: number, b: ItemInput) =>
    http.put<AdminItem>(`/admin/items/${id}`, b).then((r) => r.data),
  deleteItem: (id: number) => http.delete(`/admin/items/${id}`).then(() => undefined),
  itemStatus: (id: number, status: CatalogStatus) =>
    http.post<AdminItem>(`/admin/items/${id}/status`, { status }).then((r) => r.data),
  sizeStatus: (id: number, size: string, status: CatalogStatus) =>
    http.post<AdminItem>(`/admin/items/${id}/sizes/${size}/status`, { status }).then((r) => r.data),
  uploadImage: (id: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return http
      .post<AdminItem>(`/admin/items/${id}/image`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
  uploadToppingImage: (id: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return http
      .post<AdminTopping>(`/admin/toppings/${id}/image`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
  toppings: () => http.get<AdminTopping[]>('/admin/toppings').then((r) => r.data),
  createTopping: (b: ToppingInput) =>
    http.post<AdminTopping>('/admin/toppings', b).then((r) => r.data),
  updateTopping: (id: number, b: ToppingInput) =>
    http.put<AdminTopping>(`/admin/toppings/${id}`, b).then((r) => r.data),
  toppingStatus: (id: number, status: CatalogStatus) =>
    http.post<AdminTopping>(`/admin/toppings/${id}/status`, { status }).then((r) => r.data),
  promotions: () => http.get<Promotion[]>('/promotions').then((r) => r.data),
  createPromotion: (b: PromotionInput) =>
    http.post<Promotion>('/promotions', b).then((r) => r.data),
  updatePromotion: (id: number, b: PromotionInput) =>
    http.put<Promotion>(`/promotions/${id}`, b).then((r) => r.data),
  setPromotionActive: (id: number, active: boolean) =>
    http.post<Promotion>(`/promotions/${id}/active`, { active }).then((r) => r.data),
}

export const STATUS_LABEL: Record<CatalogStatus, string> = {
  SELLING: 'Đang bán',
  OUT_OF_STOCK: 'Hết hàng',
  STOPPED: 'Ngừng bán',
}
