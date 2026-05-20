import type { FCValue } from '@/types/fantasycalc'

const FC_URL =
  'https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=1&numTeams=12&ppr=0.5'

export async function fetchValues(): Promise<FCValue[]> {
  const res = await fetch(FC_URL, {
    next: { revalidate: 21600 },
  })
  if (!res.ok) throw new Error(`FantasyCalc ${res.status}`)
  return res.json()
}
