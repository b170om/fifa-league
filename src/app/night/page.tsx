'use client'

import { NightFlow } from '@/components/night-flow'
import { useTitle } from '@/components/league'
import { Gate } from '@/components/ui'

export default function NightPage() {
  useTitle('פלאדלייט · ערב')
  return <Gate>{(data) => <NightFlow data={data} />}</Gate>
}
