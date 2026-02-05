import type { Metadata } from "next";

import TrackOrderClient from "./TrackOrderClient";

export const metadata: Metadata = {
  title: "Track Order",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TrackOrderPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <TrackOrderClient />
      </div>
    </div>
  );
}
