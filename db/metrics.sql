-- วัดผล beta (รันใน Supabase SQL editor)

-- ผู้ใช้ที่กลับมาใน 7 วัน
select count(distinct owner_id) as returned_7d
from messages
where created_at > now() - interval '7 days';

-- สัดส่วนโซน 30 วัน
select zone, count(*) as n,
  round(100.0 * count(*) / nullif(sum(count(*)) over (), 0), 1) as pct
from triage_sessions
where created_at > now() - interval '30 days'
group by zone;

-- อัตรา 👎
select
  count(*) filter (where rating = -1) as down,
  count(*) filter (where rating = 1) as up,
  round(100.0 * count(*) filter (where rating = -1) / nullif(count(*), 0), 1) as down_pct
from feedback
where created_at > now() - interval '30 days';

-- เตือนที่ส่งถึง
select count(*) from reminder_deliveries
where status = 'sent' and sent_at > now() - interval '30 days';

-- ลิงก์สรุปที่หมอบอก helpful
select count(*) from referral_feedback where helpful = true;
