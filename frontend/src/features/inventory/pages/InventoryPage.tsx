import {
  AlertTriangle,
  ClipboardCheck,
  FlaskConical,
  PackagePlus,
  Package,
  Trash2,
  Wheat,
} from 'lucide-react'
import { PageTitle } from '@/components/ui/PageTitle'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { inventoryApi } from '../api/inventoryApi'
import { AdjustTab } from '../components/AdjustTab'
import { AlertsTab } from '../components/AlertsTab'
import { IngredientsTab } from '../components/IngredientsTab'
import { RecipesTab } from '../components/RecipesTab'
import { StockInTab } from '../components/StockInTab'
import { WasteTab } from '../components/WasteTab'

type Tab = 'alerts' | 'ingredients' | 'recipes' | 'stockin' | 'adjust' | 'waste'

/** UC-16..UC-21: kho nguyên liệu của Chủ quán/Quản lý. */
export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>('alerts')
  const alerts = useQuery({ queryKey: ['inventory', 'alerts'], queryFn: inventoryApi.alerts })
  const count = (alerts.data?.lowStock.length ?? 0) + (alerts.data?.expiring.length ?? 0)
  return (
    <section aria-label="Kho nguyên liệu">
      <PageTitle icon={Package}>Kho nguyên liệu</PageTitle>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          {
            id: 'alerts',
            label: count > 0 ? `Cảnh báo (${count})` : 'Cảnh báo',
            icon: AlertTriangle,
          },
          { id: 'ingredients', label: 'Nguyên liệu', icon: Wheat },
          { id: 'recipes', label: 'Công thức', icon: FlaskConical },
          { id: 'stockin', label: 'Nhập kho', icon: PackagePlus },
          { id: 'adjust', label: 'Kiểm kê', icon: ClipboardCheck },
          { id: 'waste', label: 'Hao hụt', icon: Trash2 },
        ]}
      />
      <TabPanel id={tab}>
        {tab === 'alerts' && <AlertsTab />}
        {tab === 'ingredients' && <IngredientsTab />}
        {tab === 'recipes' && <RecipesTab />}
        {tab === 'stockin' && <StockInTab />}
        {tab === 'adjust' && <AdjustTab />}
        {tab === 'waste' && <WasteTab />}
      </TabPanel>
    </section>
  )
}
