export interface IndustryChatbotPreset {
  id: string;
  name: string;
  industry: string;
  category: string;
  badge: string;
  iconName: string;
  description: string;
  triggerKeyword: string;
  recommendedAiSystemPrompt: string;
  nodesJson: string; // Serialized JSON string matching ChatbotBuilder canvas
}

export const INDUSTRY_CHATBOT_PRESETS: IndustryChatbotPreset[] = [
  // 1. HEALTHCARE & CLINICS
  {
    id: "healthcare-clinic-booking",
    name: "🏥 Clinic & Hospital Appointment Booking Bot",
    industry: "Healthcare & Wellness",
    category: "Appointments & Triage",
    badge: "Most Popular",
    iconName: "Stethoscope",
    description: "Automates patient department selection, doctor consultation slot booking, clinic hours lookup, and emergency contacts.",
    triggerKeyword: "doctor, appointment, clinic, consultation, book slot",
    recommendedAiSystemPrompt: "You are an empathetic, professional medical clinic assistant. Guide patients to book appointments, share clinic working hours (9 AM - 8 PM), explain consultation fees (₹500 - ₹1200), and connect them to doctors.",
    nodesJson: JSON.stringify({
      nodes: [
        {
          id: "node_start",
          type: "START",
          title: "🚀 Patient Initiates Chat",
          position: { x: 50, y: 150 },
          data: { triggerKeyword: "doctor, appointment, clinic, consultation" }
        },
        {
          id: "node_welcome",
          type: "MESSAGE",
          title: "👋 Clinic Welcome Message",
          position: { x: 300, y: 150 },
          data: {
            text: "Welcome to *Apex Multi-Speciality Clinic*! 🏥\n\nHow can our care team help you today?",
            buttons: ["📅 Book Doctor Appointment", "⏰ Clinic Hours & Location", "📋 Lab Tests & Reports", "💬 Talk to Receptionist"]
          }
        },
        {
          id: "node_dept_select",
          type: "QUESTION",
          title: "🩺 Department Selection",
          position: { x: 600, y: 100 },
          data: {
            text: "Please select the speciality department you need:\n1️⃣ General Medicine / Fever\n2️⃣ Dermatology & Skin Care\n3️⃣ Orthopedics & Joint Pain\n4️⃣ Pediatrics & Child Care\n5️⃣ Cardiology & Heart",
            variable: "patient_department"
          }
        },
        {
          id: "node_slot_date",
          type: "QUESTION",
          title: "📆 Preferred Consultation Slot",
          position: { x: 900, y: 100 },
          data: {
            text: "Please reply with your *Preferred Date & Time* (e.g. Tomorrow 4 PM) and *Patient Full Name*:",
            variable: "patient_slot_info"
          }
        },
        {
          id: "node_confirm_appt",
          type: "MESSAGE",
          title: "✅ Appointment Confirmation",
          position: { x: 1200, y: 100 },
          data: {
            text: "✅ *Appointment Request Received!*\n\nOur clinic receptionist will confirm your token within 15 minutes.\n📍 *Address:* Sector 14, Main Road\n📞 *Emergency Hotline:* +91 98765 43210"
          }
        },
        {
          id: "node_timings",
          type: "MESSAGE",
          title: "⏰ Hours & Location Info",
          position: { x: 600, y: 350 },
          data: {
            text: "🏥 *Clinic Working Hours:*\n• Morning OPD: 09:00 AM – 01:30 PM\n• Evening OPD: 05:00 PM – 09:00 PM\n• Sunday: 10:00 AM – 02:00 PM\n\n📍 *Map Location:* https://maps.google.com/?q=ApexClinic"
          }
        },
        {
          id: "node_human_transfer",
          type: "TRANSFER",
          title: "👤 Transfer to Reception",
          position: { x: 600, y: 550 },
          data: {
            team: "Reception & Doctors",
            message: "Connecting you to our clinic care manager. Please hold on..."
          }
        }
      ],
      connections: [
        { from: "node_start", to: "node_welcome" },
        { from: "node_welcome", to: "node_dept_select", condition: "Book Doctor Appointment" },
        { from: "node_welcome", to: "node_timings", condition: "Clinic Hours & Location" },
        { from: "node_welcome", to: "node_human_transfer", condition: "Talk to Receptionist" },
        { from: "node_dept_select", to: "node_slot_date" },
        { from: "node_slot_date", to: "node_confirm_appt" }
      ]
    })
  },

  // 2. EDTECH & COACHING INSTITUTES
  {
    id: "edtech-course-counselor",
    name: "🏫 EdTech Course Counselor & Demo Booking Bot",
    industry: "Education & EdTech",
    category: "Admissions & Counseling",
    badge: "High Conversion",
    iconName: "GraduationCap",
    description: "Captures student leads, delivers course syllabus PDFs, shares batch dates & fee structures, and schedules free demo classes.",
    triggerKeyword: "admission, course, coaching, syllabus, fees, demo class",
    recommendedAiSystemPrompt: "You are an inspiring, knowledgeable academic counselor for an EdTech & Coaching institute. Guide students to discover the best courses (JEE, NEET, Full Stack, UPSC), share fee structures, and encourage booking free live demo sessions.",
    nodesJson: JSON.stringify({
      nodes: [
        {
          id: "node_start",
          type: "START",
          title: "🚀 Student Starts Inquiry",
          position: { x: 50, y: 150 },
          data: { triggerKeyword: "course, syllabus, fees, demo, admission" }
        },
        {
          id: "node_welcome",
          type: "MESSAGE",
          title: "👋 Institute Welcome",
          position: { x: 300, y: 150 },
          data: {
            text: "🎓 Welcome to *Pinnacle Academy*!\n\nTransform your career with top-tier faculty and guaranteed placement support. What program are you interested in?",
            buttons: ["💻 Full-Stack Development", "📈 Digital Marketing & AI", "🎯 Data Science & Analytics", "🎓 UPSC / Govt Exams"]
          }
        },
        {
          id: "node_course_details",
          type: "MESSAGE",
          title: "📄 Course Details & Syllabus",
          position: { x: 600, y: 100 },
          data: {
            text: "🚀 *Course Highlights:*\n• 100% Live Interactive Classes\n• 15+ Real-world Projects\n• 1-on-1 Mentorship & Placement Assurance\n• Duration: 6 Months (Weekend/Weekday batches)",
            buttons: ["📥 Download Syllabus PDF", "🎥 Book Free Live Demo", "💰 Check Fee & EMI"]
          }
        },
        {
          id: "node_demo_booking",
          type: "QUESTION",
          title: "📅 Book Free Demo Slot",
          position: { x: 900, y: 100 },
          data: {
            text: "🌟 *Reserve Your Free Demo Seat:*\n\nPlease reply with your *Full Name*, *City*, and *College/Current Role*:",
            variable: "student_lead_data"
          }
        },
        {
          id: "node_meta_capi_lead",
          type: "META_CUSTOM_AUDIENCE",
          title: "🎯 Sync to Meta Ad Custom Audience",
          position: { x: 1200, y: 100 },
          data: {
            audienceName: "EdTech_High_Intent_Course_Leads",
            eventValue: 25000
          }
        },
        {
          id: "node_demo_confirmed",
          type: "MESSAGE",
          title: "🎉 Demo Access Sent",
          position: { x: 1450, y: 100 },
          data: {
            text: "🎉 *Demo Class Booked Successfully!*\n\n📅 *Next Batch:* This Saturday at 11:00 AM\n🔗 *Zoom Meeting Link:* https://zoom.us/j/academy-demo\n\nOur senior counselor will call you 15 mins prior with your study materials."
          }
        }
      ],
      connections: [
        { from: "node_start", to: "node_welcome" },
        { from: "node_welcome", to: "node_course_details" },
        { from: "node_course_details", to: "node_demo_booking", condition: "Book Free Live Demo" },
        { from: "node_demo_booking", to: "node_meta_capi_lead" },
        { from: "node_meta_capi_lead", to: "node_demo_confirmed" }
      ]
    })
  },

  // 3. REAL ESTATE & BUILDERS
  {
    id: "real-estate-site-visit",
    name: "🏡 Real Estate Site Visit & Project Brochure Bot",
    industry: "Real Estate & Builders",
    category: "Property Inquiries",
    badge: "High Ticket",
    iconName: "Building",
    description: "Filters buyers by property configuration (1/2/3 BHK & Luxury Villas), budget range, shares digital brochures, and schedules on-site property tours.",
    triggerKeyword: "property, flat, villa, 2bhk, 3bhk, brochure, site visit",
    recommendedAiSystemPrompt: "You are an elite real estate sales consultant representing premium residential projects. Assist buyers with floor plans, amenities, price sheets, and prompt them to schedule VIP site visits.",
    nodesJson: JSON.stringify({
      nodes: [
        {
          id: "node_start",
          type: "START",
          title: "🚀 Buyer Inquires About Property",
          position: { x: 50, y: 150 },
          data: { triggerKeyword: "flat, property, villa, 2bhk, 3bhk, brochure" }
        },
        {
          id: "node_welcome",
          type: "MESSAGE",
          title: "🏢 Luxury Residences Welcome",
          position: { x: 300, y: 150 },
          data: {
            text: "Welcome to *Prestige Green Heights* — Ultra-luxury 2 & 3 BHK residences overlooking the golf course. ⛳\n\nWhat type of home are you exploring?",
            buttons: ["🏡 2 BHK Premium (1150 sq.ft)", "🏰 3 BHK Luxury (1650 sq.ft)", "👑 Penthouse & Sky Villas", "📍 Project Location & Pricing"]
          }
        },
        {
          id: "node_budget_filter",
          type: "QUESTION",
          title: "💰 Budget Range Selection",
          position: { x: 600, y: 100 },
          data: {
            text: "What is your target investment budget?\n1️⃣ ₹65 Lakhs – ₹90 Lakhs\n2️⃣ ₹90 Lakhs – ₹1.4 Crore\n3️⃣ ₹1.5 Crore – ₹3.0 Crore+",
            variable: "buyer_budget_range"
          }
        },
        {
          id: "node_site_visit_prompt",
          type: "QUESTION",
          title: "🚗 Schedule Free Site Visit & Cab",
          position: { x: 900, y: 100 },
          data: {
            text: "Experience the sample flat in person! We provide *Complimentary AC Cab Pick & Drop* for your family.\n\nPlease reply with your *Preferred Date* (e.g. This Sunday 3 PM) and *Pickup Address*:",
            variable: "site_visit_booking"
          }
        },
        {
          id: "node_site_visit_confirmed",
          type: "MESSAGE",
          title: "✅ VIP Tour Confirmed",
          position: { x: 1200, y: 100 },
          data: {
            text: "✅ *VIP Site Visit Scheduled!*\n\nOur relationship manager *Mr. Rohit Sharma* will contact you shortly with driver details.\n📥 *Download Full E-Brochure:* https://espon.in/brochure.pdf"
          }
        }
      ],
      connections: [
        { from: "node_start", to: "node_welcome" },
        { from: "node_welcome", to: "node_budget_filter" },
        { from: "node_budget_filter", to: "node_site_visit_prompt" },
        { from: "node_site_visit_prompt", to: "node_site_visit_confirmed" }
      ]
    })
  },

  // 4. AUTOMOBILE DEALERSHIP & WORKSHOP
  {
    id: "auto-test-drive-service",
    name: "🚗 Automobile Test Drive & Service Scheduler",
    industry: "Automobile & Services",
    category: "Dealership & Service",
    badge: "Automated",
    iconName: "Car",
    description: "Enables customers to book doorstep test drives, schedule car maintenance service slots, calculate EMI, and request trade-in quotes.",
    triggerKeyword: "car, test drive, service, booking, showroom, emi",
    recommendedAiSystemPrompt: "You are an enthusiastic automobile dealership representative. Help customers book test drives for new car models, schedule service pick-ups, and calculate approximate EMI schemes.",
    nodesJson: JSON.stringify({
      nodes: [
        {
          id: "node_start",
          type: "START",
          title: "🚀 Customer Messages Dealership",
          position: { x: 50, y: 150 },
          data: { triggerKeyword: "test drive, service, car price, booking" }
        },
        {
          id: "node_welcome",
          type: "MESSAGE",
          title: "🚗 Dealership Welcome",
          position: { x: 300, y: 150 },
          data: {
            text: "👋 Welcome to *Apex Motors*!\n\nHow can our automotive specialists assist you today?",
            buttons: ["🏎️ Book Home Test Drive", "🔧 Book Car Service Slot", "💰 Get On-Road Price & EMI", "📍 Showroom Directions"]
          }
        },
        {
          id: "node_car_model_select",
          type: "QUESTION",
          title: "🚘 Select Car Model",
          position: { x: 600, y: 100 },
          data: {
            text: "Which model are you excited to test drive?\n1️⃣ Apex SUV (Petrol / Hybrid)\n2️⃣ Apex EV (450km range)\n3️⃣ Apex Turbo Sedan",
            variable: "selected_car_model"
          }
        },
        {
          id: "node_test_drive_address",
          type: "QUESTION",
          title: "📍 Doorstep Address & Time",
          position: { x: 900, y: 100 },
          data: {
            text: "Our test drive vehicle will arrive at your home! Please reply with your *Home/Office Address* and *Preferred Date/Time*:",
            variable: "test_drive_address"
          }
        },
        {
          id: "node_test_drive_confirmed",
          type: "MESSAGE",
          title: "✅ Test Drive Booking Confirmed",
          position: { x: 1200, y: 100 },
          data: {
            text: "🚀 *Test Drive Confirmed!*\n\nOur product specialist will arrive with the vehicle at your specified time. Please keep your valid driving license handy."
          }
        }
      ],
      connections: [
        { from: "node_start", to: "node_welcome" },
        { from: "node_welcome", to: "node_car_model_select", condition: "Book Home Test Drive" },
        { from: "node_car_model_select", to: "node_test_drive_address" },
        { from: "node_test_drive_address", to: "node_test_drive_confirmed" }
      ]
    })
  },

  // 5. RESTAURANTS, CAFES & BANQUET VENUES
  {
    id: "restaurant-table-party-booking",
    name: "🍽️ Restaurant Table & Event Booking Bot",
    industry: "Hospitality & Restaurants",
    category: "Reservations & Orders",
    badge: "Interactive",
    iconName: "Utensils",
    description: "Takes instant table reservations, shares digital food & bar menus, collects party hall inquiries, and provides directions.",
    triggerKeyword: "table, menu, booking, party, reservation, food",
    recommendedAiSystemPrompt: "You are a warm, welcoming restaurant host for a premium dining venue. Help guests reserve tables, share chef special menus, dietary options, and birthday/party packages.",
    nodesJson: JSON.stringify({
      nodes: [
        {
          id: "node_start",
          type: "START",
          title: "🚀 Guest Connects with Restaurant",
          position: { x: 50, y: 150 },
          data: { triggerKeyword: "table, menu, booking, party, food" }
        },
        {
          id: "node_welcome",
          type: "MESSAGE",
          title: "🍷 Restaurant Greeting",
          position: { x: 300, y: 150 },
          data: {
            text: "Welcome to *The Urban Bistro & Lounge*! 🍽️✨\n\nHow can we delight your dining experience today?",
            buttons: ["🪑 Reserve a Table", "📖 View Food & Drink Menu", "🎉 Birthday & Party Booking", "📍 Map & Valet Parking"]
          }
        },
        {
          id: "node_table_details",
          type: "QUESTION",
          title: "👥 Guest Count & Timing",
          position: { x: 600, y: 100 },
          data: {
            text: "Please reply with *Date, Time & Number of Guests* (e.g., Tonight 8 PM, 4 Guests):",
            variable: "table_booking_details"
          }
        },
        {
          id: "node_table_confirmed",
          type: "MESSAGE",
          title: "✅ Reservation Confirmed",
          position: { x: 900, y: 100 },
          data: {
            text: "🎉 *Table Reservation Received!*\n\nWe have held your table. We hold reservations up to 15 minutes past booking time.\n📍 *Valet Parking Available at Entrance.*"
          }
        }
      ],
      connections: [
        { from: "node_start", to: "node_welcome" },
        { from: "node_welcome", to: "node_table_details", condition: "Reserve a Table" },
        { from: "node_table_details", to: "node_table_confirmed" }
      ]
    })
  },

  // 6. B2B AGENCIES & PROFESSIONAL SERVICES
  {
    id: "b2b-lead-qualification",
    name: "💼 B2B Lead Qualification & RFP Generator",
    industry: "B2B & Professional Services",
    category: "Lead Qualification",
    badge: "Enterprise",
    iconName: "Briefcase",
    description: "Screens prospective clients with automated qualification questions (Budget, Timeline, Scope) and books consultation calls with senior directors.",
    triggerKeyword: "agency, quote, service, rfp, development, marketing, hire",
    recommendedAiSystemPrompt: "You are an executive business consultant for a digital growth agency. Qualify prospective B2B clients on project scope, timeline, budget (> ₹1 Lakh), and schedule strategy discovery calls.",
    nodesJson: JSON.stringify({
      nodes: [
        {
          id: "node_start",
          type: "START",
          title: "🚀 Prospective Client Reaches Out",
          position: { x: 50, y: 150 },
          data: { triggerKeyword: "quote, service, hire, rfp, development" }
        },
        {
          id: "node_welcome",
          type: "MESSAGE",
          title: "💼 Agency Introduction",
          position: { x: 300, y: 150 },
          data: {
            text: "Hi! Welcome to *Nexus Digital Solutions*. 🚀\n\nWe build bespoke mobile apps, cloud systems, and performance marketing engines. What is your primary business objective?",
            buttons: ["💻 Custom Software / Web App", "📱 iOS & Android Mobile App", "🚀 Performance Marketing & SEO", "🤖 AI & WhatsApp Automation"]
          }
        },
        {
          id: "node_budget_question",
          type: "QUESTION",
          title: "💵 Project Budget Range",
          position: { x: 600, y: 100 },
          data: {
            text: "To assign the right senior architect, what is your estimated project budget?\n1️⃣ ₹1 Lakh – ₹3 Lakhs\n2️⃣ ₹3 Lakhs – ₹10 Lakhs\n3️⃣ ₹10 Lakhs – ₹50 Lakhs+\n4️⃣ Flexible / Not sure yet",
            variable: "b2b_budget"
          }
        },
        {
          id: "node_cal_booking",
          type: "MESSAGE",
          title: "📅 Strategy Call Booking",
          position: { x: 900, y: 100 },
          data: {
            text: "🎯 *Great fit! Let's schedule a 30-min discovery call:*\n\nTap below to pick a slot directly on our Director's calendar:\n🔗 https://calendly.com/nexus-consult/discovery\n\nWe look forward to accelerating your growth!"
          }
        }
      ],
      connections: [
        { from: "node_start", to: "node_welcome" },
        { from: "node_welcome", to: "node_budget_question" },
        { from: "node_budget_question", to: "node_cal_booking" }
      ]
    })
  },

  // 7. RETAIL & E-COMMERCE CONVERSION BOT
  {
    id: "ecommerce-sales-recovery",
    name: "🛍️ E-Commerce Catalog & COD to Prepaid Bot",
    industry: "E-Commerce & Retail",
    category: "Sales & Recovery",
    badge: "High ROAS",
    iconName: "ShoppingBag",
    description: "Displays interactive product collections, accepts 1-click WhatsApp orders, offers instant prepaid discounts on COD orders, and sends abandoned cart recovery reminders.",
    triggerKeyword: "shop, buy, catalog, price, order, discount",
    recommendedAiSystemPrompt: "You are an energetic personal shopping stylist for a trendy retail brand. Recommend products, share sizing guides, and encourage online payments via UPI for extra discounts.",
    nodesJson: JSON.stringify({
      nodes: [
        {
          id: "node_start",
          type: "START",
          title: "🚀 Customer Starts Shopping",
          position: { x: 50, y: 150 },
          data: { triggerKeyword: "shop, buy, catalog, order, price" }
        },
        {
          id: "node_welcome",
          type: "MESSAGE",
          title: "🛍️ Store Welcome & Catalog",
          position: { x: 300, y: 150 },
          data: {
            text: "Hey! Welcome to *TrendStore* 🔥\n\nExplore our bestsellers with *Free Express Shipping* & *Easy 7-Day Exchange*:",
            buttons: ["👕 New Arrivals Collection", "🔥 Today's Flash Deals (Flat 40% OFF)", "📦 Track My Order", "💬 Speak to Stylist"]
          }
        },
        {
          id: "node_catalog_view",
          type: "CATALOG",
          title: "👗 Interactive WhatsApp Catalog",
          position: { x: 600, y: 100 },
          data: {
            catalogTitle: "Top Trending Products",
            buttonText: "Browse Products"
          }
        },
        {
          id: "node_instant_checkout",
          type: "PAYMENT_LINK",
          title: "💳 1-Click Instant UPI Payment",
          position: { x: 900, y: 100 },
          data: {
            amount: 999,
            description: "Instant WhatsApp Checkout with 5% Extra Prepaid Discount"
          }
        }
      ],
      connections: [
        { from: "node_start", to: "node_welcome" },
        { from: "node_welcome", to: "node_catalog_view", condition: "New Arrivals Collection" },
        { from: "node_catalog_view", to: "node_instant_checkout" }
      ]
    })
  },

  // 8. HOME & FIELD SERVICES
  {
    id: "field-service-repair",
    name: "🔧 Home & Field Service Booking Bot",
    industry: "Home & Field Services",
    category: "Service Booking",
    badge: "High Utility",
    iconName: "Wrench",
    description: "Collects customer location, symptom descriptions, photo uploads of appliances, and dispatches verified technicians with estimated arrival slots.",
    triggerKeyword: "repair, service, plumber, electrician, ac, appliance",
    recommendedAiSystemPrompt: "You are a helpful customer service coordinator for on-demand home repair services (AC, Plumbing, Electrical, Cleaning). Collect customer address, issue description, and assign technicians.",
    nodesJson: JSON.stringify({
      nodes: [
        {
          id: "node_start",
          type: "START",
          title: "🚀 Customer Requests Home Repair",
          position: { x: 50, y: 150 },
          data: { triggerKeyword: "repair, service, plumber, electrician, ac" }
        },
        {
          id: "node_welcome",
          type: "MESSAGE",
          title: "🔧 Service Selection",
          position: { x: 300, y: 150 },
          data: {
            text: "Welcome to *QuickFix Home Services*! 🛠️\n\nSelect your required repair service for verified technician dispatch:",
            buttons: ["❄️ AC Repair & Gas Refill", "⚡ Electrical & Inverter", "🚰 Plumbing & Water Leakage", "🧹 Deep Home Cleaning"]
          }
        },
        {
          id: "node_location_capture",
          type: "QUESTION",
          title: "📍 Address & Problem Description",
          position: { x: 600, y: 100 },
          data: {
            text: "Please reply with your *Complete Address (with Pincode)* and a brief description of the issue:",
            variable: "service_address"
          }
        },
        {
          id: "node_tech_dispatch_confirm",
          type: "MESSAGE",
          title: "✅ Technician Scheduled",
          position: { x: 900, y: 100 },
          data: {
            text: "✅ *Service Request Booked!*\n\n• Inspection Fee: ₹199 (Adjusted in final bill)\n• Technician: *Mr. Vijay Kumar (4.9 ★)*\n• Estimated Arrival: Within 90 minutes\n\nTrack technician on live map: https://quickfix.in/track"
          }
        }
      ],
      connections: [
        { from: "node_start", to: "node_welcome" },
        { from: "node_welcome", to: "node_location_capture" },
        { from: "node_location_capture", to: "node_tech_dispatch_confirm" }
      ]
    })
  }
];
