import { NextResponse } from 'next/server';
import { fetchDiningFacilityData } from '@/lib/diningFacility';

export async function GET(request: Request) {
  try {
    const menuData = await fetchDiningFacilityData();
    return NextResponse.json(menuData);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}