// Where Growth Starter buyers book their onboarding call: its own Calendly
// event when configured, so buyers don't land on the free audit calendar.
export const growthStarterBookingUrl =
  process.env.NEXT_PUBLIC_GROWTH_STARTER_CALENDLY_URL ??
  process.env.NEXT_PUBLIC_MANAGED_ASO_CALENDLY_URL ??
  null;
