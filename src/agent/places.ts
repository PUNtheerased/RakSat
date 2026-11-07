import { config } from '../config.js';
import type { Clinic, Location } from '../types.js';

function km(a: Location, b: Location): number {
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

interface Place {
  id: string; displayName?: { text: string }; formattedAddress?: string; nationalPhoneNumber?: string;
  location?: { latitude: number; longitude: number }; currentOpeningHours?: { openNow?: boolean };
  rating?: number; userRatingCount?: number;
}

interface PlacesResp { places?: Place[] }

async function searchPlaces(loc: Location, withRatings: boolean): Promise<Place[]> {
  if (!config.GOOGLE_PLACES_API_KEY) return [];
  const fields = [
    'places.id', 'places.displayName', 'places.formattedAddress', 'places.nationalPhoneNumber',
    'places.location', 'places.currentOpeningHours.openNow',
  ];
  if (withRatings) fields.push('places.rating', 'places.userRatingCount');
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': config.GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': fields.join(','),
    },
    body: JSON.stringify({
      textQuery: 'คลินิกสัตว์ โรงพยาบาลสัตว์', languageCode: 'th', maxResultCount: 10,
      locationBias: { circle: { center: { latitude: loc.lat, longitude: loc.lng }, radius: 10000 } },
    }),
  });
  if (!res.ok) throw new Error(`places ${res.status}`);
  const data = (await res.json()) as PlacesResp;
  return data.places ?? [];
}

/** ฉุกเฉิน: ระยะทาง + เปิดอยู่ตอนนี้ — ไม่ถ่วงคะแนน */
export async function findClinics(loc: Location, openNowOnly = false): Promise<Clinic[]> {
  const places = await searchPlaces(loc, false);
  return places
    .filter((p) => p.location)
    .map((p) => ({
      id: p.id, name: p.displayName?.text ?? 'ไม่ทราบชื่อ', address: p.formattedAddress ?? '',
      phone: p.nationalPhoneNumber, openNow: p.currentOpeningHours?.openNow,
      distanceKm: Math.round(km(loc, { lat: p.location!.latitude, lng: p.location!.longitude }) * 10) / 10,
    }))
    .filter((c) => !openNowOnly || c.openNow !== false)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 5);
}

/**
 * หาทั่วไป: คะแนนร่วมระยะทาง ปรับตามจำนวนรีวิว
 * ไม่เก็บคะแนนลง DB — คืนเฉพาะใน response
 */
export async function findClinicsGeneral(loc: Location): Promise<Clinic[]> {
  const places = await searchPlaces(loc, true);
  return places
    .filter((p) => p.location)
    .map((p) => {
      const distanceKm = Math.round(km(loc, { lat: p.location!.latitude, lng: p.location!.longitude }) * 10) / 10;
      const rating = p.rating ?? 0;
      const ratingCount = p.userRatingCount ?? 0;
      const bayesian = (ratingCount / (ratingCount + 20)) * rating + (20 / (ratingCount + 20)) * 3.8;
      const score = bayesian - distanceKm * 0.08;
      const reason = ratingCount
        ? `${rating.toFixed(1)} จาก ${ratingCount} รีวิว · ห่าง ${distanceKm} กม.`
        : `ห่าง ${distanceKm} กม. · คะแนนรีวิวยังน้อย`;
      return {
        id: p.id, name: p.displayName?.text ?? 'ไม่ทราบชื่อ', address: p.formattedAddress ?? '',
        phone: p.nationalPhoneNumber, openNow: p.currentOpeningHours?.openNow,
        distanceKm, rating, ratingCount, reason, _score: score,
      };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 5)
    .map((c) => ({
      id: c.id, name: c.name, address: c.address, phone: c.phone, openNow: c.openNow,
      distanceKm: c.distanceKm, rating: c.rating, ratingCount: c.ratingCount, reason: c.reason,
    }));
}
