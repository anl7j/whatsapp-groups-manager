<p align="center">
  <img src="assets/logo.png" alt="WhatsApp Groups Manager Logo" width="220" style="border-radius: 20px;">
</p>

# منصة إدارة مجموعات ومجتمعات واتساب
**Open-Source WhatsApp Groups & Communities Management Platform**

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT">
  <img src="https://img.shields.io/badge/Node.js-18+-blue.svg" alt="Node.js Version">
  <img src="https://img.shields.io/badge/Engine-Baileys-emerald.svg" alt="WhatsApp Engine">
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen.svg" alt="PRs Welcome">
  <img src="https://img.shields.io/badge/Open--Source-100%25-orange.svg" alt="Open Source">
</p>

منصة مفتوحة المصدر (Open Source) مبنية بلغة **JavaScript / Node.js** ومحرك **Baileys** لإدارة مجموعات ومجتمعات واتساب بكفاءة وسرعة فائقة، مع واجهة مستخدم عصرية باللغة العربية (RTL)، تدعم تصدير جهات الاتصال وإدارة الأعضاء والوسوم (Group Tags) وواجهة برمجة تطبيقات (REST API).

---

## 🌟 المزايا الرئيسية (Features)

* **استعراض وتصفية المجموعات والمجتمعات**:
  * جلب لحظي لكافة المجموعات والمجتمعات مع تصنيف دقيق (المجموعات فقط / المجتمعات فقط / التي أنت مشرف فيها / عضو).
  * عدّادات تفاعلية ديناميكية وإحصائيات مباشرة (KPIs).
  * شريط بحث ذكي باسم المجموعة أو المعرف.
* **دليل الأعضاء الموحّد والوسوم (Group Tags Directory)**:
  * تجميع كافة الأعضاء في دليل شامل بضغطة زر.
  * وسم (Tag) ملوّن لكل عضو يوضح المجموعة أو المجموعات التابع لها.
  * فلترة بالوسم وبحث فوري بالاسم أو الرقم.
  * تصدير مجمع لكافة الأعضاء مع وسوم مجموعاتهم بصيغة CSV (Excel).
* **إدارة الأعضاء (Members Management)**:
  * إضافة أعضاء جدد لأي مجموعة برقم الهاتف.
  * طرد الأعضاء (Kick) مع رسالة تأكيد لحماية المجموعة.
  * ترقية عضو لمشرف (Promote) / خفض رتبة المشرف (Demote).
  * تصدير قائمة أرقام ورتب أعضاء أي مجموعة كملف CSV جاهز لبرامج الإرسال والتسويق.
* **التحكم بالمجموعات وإرسال الرسائل**:
  * قفل الإرسال للمشرفين فقط (Announcement Mode) أو فتحه للجميع بنقرة زر.
  * نسخ رابط الدعوة الخاص بالمجموعة مباشرة للحافظة.
  * إرسال رسائل وإعلانات للمجموعة مباشرة من لوحة التحكم أو عبر الـ API.
* **تصميم عصري ونظيف**:
  * واجهة داكنة مريحة للعين بنمط واتساب الحديث.
  * خالية تماماً من الإيموجي وتعتمد على أيقونات Vector (SVG) احترافية.
  * دعم التحديث المباشر لحالة الجلسة ورمز الاستجابة السريعة (QR Code) عبر WebSockets.

---

## 🛠️ متطلبات التشغيل (Requirements)
* **Node.js** (إصدار 18 فما فوق).
* **npm** (إصدار 9 فما فوق).
* هاتف به تطبيق **واتساب** نشط لمسح رمز الـ QR Code عند أول تشغيل.

---

## 🚀 طريقة التثبيت والتشغيل (Quick Start)

```bash
# 1. استنساخ المستودع (Clone the repository)
git clone https://github.com/<your-username>/whatsapp-community-manager.git
cd whatsapp-community-manager

# 2. تثبيت الحزم (Install dependencies)
npm install

# 3. تشغيل المنصة في وضع التطوير (Auto-reload)
npm run dev

# أو التشغيل العادي:
npm start
```

بعد التشغيل، افتح المتصفح على:
👉 **`http://localhost:3000`**

---

## 📱 خطوات ربط الحساب (Link Account)
1. افتح صفحة المنصة في المتصفح.
2. ستظهر لك شاشة بها رمز الاستجابة السريعة (**QR Code**).
3. افتح تطبيق **واتساب** في جوالك 👈 الإعدادات (أو القائمة الثلاثية) 👈 **الأجهزة المرتبطة (Linked Devices)**.
4. اضغط **ربط جهاز** وامسح الرمز المعروض على الشاشة.
5. بمجرد المسح، سيتم حفظ الجلسة محلياً في مجلد `auth_info_baileys`، وستظهر كافة مجموعاتك ومجتمعاتك فوراً!

---

## 🔌 واجهة الـ REST API

| الطريقة | المسار (Endpoint) | الوصف |
| :--- | :--- | :--- |
| `GET` | `/api/status` | فحص حالة الاتصال ومعلومات الحساب المتصل |
| `GET` | `/api/groups` | جلب قائمة كافة المجموعات والمجتمعات مع الإحصائيات |
| `GET` | `/api/groups/:jid` | جلب تفاصيل مجموعة محددة وقائمة أعضائها بالكامل |
| `POST` | `/api/groups/:jid/participants` | إضافة / طرد / ترقية / خفض رتبة عضو (`add`, `remove`, `promote`, `demote`) |
| `POST` | `/api/groups/:jid/setting` | تعديل إعداد قفل الإرسال (`announce`) |
| `GET` | `/api/groups/:jid/invite` | استخراج رابط دعوة المجموعة |
| `POST` | `/api/groups/:jid/send` | إرسال رسالة نصية للمجموعة |
| `GET` | `/api/groups/:jid/export-csv` | تحميل ملف CSV يحتوي على أرقام ورتب الأعضاء |
| `GET` | `/api/members` | جلب قائمة كافة الأعضاء الموحّدة مع وسوم مجموعاتهم |
| `GET` | `/api/members/export-csv` | تصدير كافة الأعضاء عبر كل المجموعات مع وسومها بملف CSV |
| `POST` | `/api/logout` | تسجيل الخروج ومسح الجلسة للربط بحساب آخر |

---

## 🤝 المساهمة (Contributing)
المشروع مفتوح المصدر ونرحب بجميع المساهمات والاقتراحات! 
يرجى قراءة دليل المساهمة [CONTRIBUTING.md](CONTRIBUTING.md) للتعرف على كيفية إرسال الـ Pull Requests والتبليغ عن المشاكل.

---

## 📜 الترخيص (License)
هذا المشروع مرخص بموجب رخصة **MIT License** - راجع ملف [LICENSE](LICENSE) لمزيد من التفاصيل.
