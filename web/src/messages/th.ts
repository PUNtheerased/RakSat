export type Messages = {
  brand: string;
  tagline: string;
  disclaimer: string;
  login: string;
  signup: string;
  email: string;
  password: string;
  logout: string;
  consentTitle: string;
  consentBody: string;
  consentAccept: string;
  inviteTitle: string;
  inviteHint: string;
  inviteSubmit: string;
  homeTitle: string;
  addPet: string;
  chatCta: string;
  clinicsManage: string;
  reminders: string;
  settings: string;
  zoneGreen: string;
  zoneYellow: string;
  zoneRed: string;
  confirm: string;
  reject: string;
  loading: string;
  empty: string;
  error: string;
  dailyLimit: string;
  emergencyTitle: string;
  sendSummary: string;
  primaryClinic: string;
  nearbyOpen: string;
  requestLocation: string;
  language: string;
  lineLink: string;
  deleteAccount: string;
  helpfulYes: string;
  helpfulNo: string;
  admin: string;
  openApp: string;
  landingHeadline: string;
  landingLead: string;
  landingCta: string;
  landingHow: string;
  landingHowTitle: string;
  landingStep1Title: string;
  landingStep1Body: string;
  landingStep2Title: string;
  landingStep2Body: string;
  landingStep3Title: string;
  landingStep3Body: string;
  landingNotTitle: string;
  landingNotBody: string;
};

export const th: Messages = {
  brand: 'RakSat',
  tagline: 'ผู้ช่วยดูแลสุนัขและแมว — ประเมินเบื้องต้น ไม่ใช่การวินิจฉัย',
  disclaimer: 'เป็นการประเมินเบื้องต้นโดย AI ไม่ใช่การวินิจฉัยโดยสัตวแพทย์',
  login: 'เข้าสู่ระบบ',
  signup: 'สมัคร',
  email: 'อีเมล',
  password: 'รหัสผ่าน',
  logout: 'ออกจากระบบ',
  consentTitle: 'ความยินยอมก่อนใช้งาน',
  consentBody:
    'RakSat เก็บข้อมูลสัตว์เลี้ยงและบทสนทนาเพื่อช่วยคัดกรองความเร่งด่วน ทีมงานและสัตวแพทย์ที่รีวิวอาจอ่านบทสนทนาเพื่อปรับปรุงความปลอดภัย คุณลบข้อมูลทั้งหมดได้ทุกเมื่อในตั้งค่า',
  consentAccept: 'ยอมรับและเริ่มใช้',
  inviteTitle: 'ใส่รหัสเชิญ',
  inviteHint: 'รูปแบบ RAK-XXXX-XXXX',
  inviteSubmit: 'เปิดใช้งาน',
  homeTitle: 'สัตว์ของฉัน',
  addPet: 'เพิ่มสัตว์',
  chatCta: 'น้องมีอาการผิดปกติ',
  clinicsManage: 'คลินิกประจำ',
  reminders: 'การเตือน',
  settings: 'ตั้งค่า',
  zoneGreen: 'ดูแลทั่วไป',
  zoneYellow: 'เฝ้าสังเกต',
  zoneRed: 'ไปคลินิกทันที',
  confirm: 'ยืนยัน',
  reject: 'ไม่เอา',
  loading: 'กำลังโหลด…',
  empty: 'ยังไม่มีข้อมูล',
  error: 'เกิดข้อผิดพลาด ลองใหม่อีกครั้งได้',
  dailyLimit: 'วันนี้คุยครบโควตาแล้ว — กรณีฉุกเฉินยังใช้ได้เสมอ',
  emergencyTitle: 'ควรพาไปคลินิกทันที',
  sendSummary: 'ส่งสรุปให้หมอ',
  primaryClinic: 'คลินิกประจำ',
  nearbyOpen: 'คลินิกใกล้ที่เปิดอยู่ตอนนี้',
  requestLocation: 'แชร์ตำแหน่งเพื่อหาคลินิกใกล้ตัว',
  language: 'ภาษา',
  lineLink: 'เชื่อม LINE',
  deleteAccount: 'ลบข้อมูลทั้งหมด',
  helpfulYes: 'เป็นประโยชน์',
  helpfulNo: 'ยังไม่ช่วย',
  admin: 'แอดมิน',
  openApp: 'เข้าใช้งาน',
  landingHeadline: 'รู้ว่าควรรอหรือควรพาไปคลินิก',
  landingLead:
    'RakSat ช่วยคัดกรองอาการสุนัขและแมวเบื้องต้น เตือนเมื่อน่าเป็นห่วง และสรุปอาการให้สัตวแพทย์เมื่อคุณยืนยัน',
  landingCta: 'เริ่มใช้งาน',
  landingHow: 'ดูว่าระบบช่วยอะไร',
  landingHowTitle: 'ทำงานอย่างไร',
  landingStep1Title: 'เล่าอาการเป็นภาษาพูด',
  landingStep1Body: 'ระบบประเมินความเร่งด่วนเป็นโซนเขียว เหลือง หรือแดง พร้อมเหตุผลสั้นๆ',
  landingStep2Title: 'ถ้าฉุกเฉิน จะพาหาคลินิกทันที',
  landingStep2Body: 'โชว์คลินิกประจำและคลินิกใกล้ที่เปิดอยู่ พร้อมส่งสรุปให้หมอเมื่อคุณกดยืนยัน',
  landingStep3Title: 'คุณเป็นผู้ตัดสินใจเสมอ',
  landingStep3Body: 'การบันทึก การตั้งเตือน และการแชร์ข้อมูลต้องผ่านปุ่มยืนยันของคุณ',
  landingNotTitle: 'สิ่งที่ RakSat ไม่ทำ',
  landingNotBody: 'ไม่วินิจฉัยโรค ไม่บอกชื่อยาหรือขนาดยา และไม่แทนที่การตรวจโดยสัตวแพทย์',
};
