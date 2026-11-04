/** Display names only. Whether a feature is on always comes from the registry. */
export const FEATURE_INFO: Record<string, { label: string; desc: string }> = {
  bookingPWA: {
    label: "Online booking app",
    desc: "Customers book slots from the TurfOS booking app.",
  },
  onlinePayments: { label: "Online payments", desc: "Collect payments online via Razorpay." },
  manualBookings: { label: "Manual bookings", desc: "Create bookings from the admin panel." },
  calendarManagement: {
    label: "Calendar management",
    desc: "Month view of availability per pitch.",
  },
  basicAnalytics: {
    label: "Analytics",
    desc: "Overview dashboard with revenue and booking trends.",
  },
  coupons: { label: "Coupons", desc: "Percentage discount codes for customers." },
  advancedAnalytics: {
    label: "Advanced analytics",
    desc: "Peak hours, weekday trends, repeat customers and more.",
  },
  leaderboards: { label: "Leaderboards", desc: "Top customers by bookings and spend." },
  pitchWiseReports: {
    label: "Pitch-wise reports",
    desc: "Revenue and utilisation broken down by pitch.",
  },
  staffManagement: { label: "Staff accounts", desc: "Give your team their own logins." },
  roleBasedAccess: {
    label: "Roles & permissions",
    desc: "Choose exactly which sections each staff member can use.",
  },
  financialExports: {
    label: "Financial exports",
    desc: "Download bookings and payments as CSV / Excel.",
  },
};

export const featureLabel = (key: string) => FEATURE_INFO[key]?.label ?? key;
