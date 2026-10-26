import { CalendarClock, Clock, UsersRound, Users } from 'lucide-react'
import { PageTitle } from '@/components/ui/PageTitle'
import { useState } from 'react'
import { Tabs } from '@/components/ui/Tabs'
import { AttendanceTab } from '../components/AttendanceTab'
import { DayTab } from '../components/DayTab'
import { StaffTab } from '../components/StaffTab'

type Tab = 'staff' | 'attendance' | 'day'

/** UC-04, UC-29, UC-31, UC-32: nhân sự, chấm công, ca và chốt ngày. */
export default function StaffPage() {
  const [tab, setTab] = useState<Tab>('staff')
  return (
    <section aria-label="Nhân sự và ca">
      <PageTitle icon={UsersRound}>Nhân sự & ca</PageTitle>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'staff', label: 'Nhân viên', icon: Users },
          { id: 'attendance', label: 'Chấm công', icon: Clock },
          { id: 'day', label: 'Ca & chốt ngày', icon: CalendarClock },
        ]}
      />
      {tab === 'staff' && <StaffTab />}
      {tab === 'attendance' && <AttendanceTab />}
      {tab === 'day' && <DayTab />}
    </section>
  )
}
