import { BookOpen, Coffee, Percent, Sparkles } from 'lucide-react'
import { PageTitle } from '@/components/ui/PageTitle'
import { useState } from 'react'
import { Tabs } from '@/components/ui/Tabs'
import { ItemsTab } from '../components/ItemsTab'
import { PromotionsTab } from '../components/PromotionsTab'
import { ToppingsTab } from '../components/ToppingsTab'

type Tab = 'items' | 'toppings' | 'promotions'

/** UC-05, UC-06, UC-27: thực đơn, topping và khuyến mãi của Chủ quán/Quản lý. */
export default function MenuPage() {
  const [tab, setTab] = useState<Tab>('items')
  return (
    <section aria-label="Thực đơn">
      <PageTitle icon={BookOpen}>Thực đơn</PageTitle>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'items', label: 'Món', icon: Coffee },
          { id: 'toppings', label: 'Topping', icon: Sparkles },
          { id: 'promotions', label: 'Khuyến mãi', icon: Percent },
        ]}
      />
      {tab === 'items' && <ItemsTab />}
      {tab === 'toppings' && <ToppingsTab />}
      {tab === 'promotions' && <PromotionsTab />}
    </section>
  )
}
