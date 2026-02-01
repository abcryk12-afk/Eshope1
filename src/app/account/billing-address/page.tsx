"use client";

import AccountAddressesClient from "@/app/account/shipping-address/AccountAddressesClient";

export default function AccountBillingAddressPage() {
  return <AccountAddressesClient initialTab="billing" />;
}
