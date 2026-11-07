# Backend E2E (ของจริง)

ต้องมี: Supabase (SG) รัน `db/schema.sql`, `.env` ครบ, LINE OA (ถ้าทดสอบเตือน)

```bash
# 1) ใส่ JWT จาก Supabase Auth (session.access_token)
export TOKEN=...
export API=http://localhost:8787

curl -s $API/health

curl -s -H "Authorization: Bearer $TOKEN" $API/api/me

curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{}' $API/api/consent

# ถ้า require_invite=true — redeem key ที่สร้างจาก admin
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"code":"RAK-XXXX-XXXX"}' $API/api/invite/redeem

curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"มอลลี่","species":"dog"}' $API/api/pets
# จำ PET_ID

curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"placeId":"places/demo","label":"คลินิกประจำ","isPrimary":true}' \
  $API/api/pets/$PET_ID/clinics

curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"petId":"'$PET_ID'","message":"น้องกินข้าวปกติ"}' $API/api/chat

# โซนแดง (ไม่ติดโควตา)
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"petId":"'$PET_ID'","message":"ชัก หายใจลำบาก","location":{"lat":13.75,"lng":100.5}}' $API/api/chat

curl -s -H "Authorization: Bearer $TOKEN" \
  "$API/api/clinics?lat=13.75&lng=100.5&mode=emergency"

curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"petId":"'$PET_ID'"}' $API/api/referrals

curl -s -H "Authorization: Bearer $TOKEN" $API/api/pets/$PET_ID/messages
```

สถานะเครื่องนี้: ยังไม่ได้รันกับ Supabase/LLM/LINE จริงจนกว่าจะมี credentials ใน `.env`
