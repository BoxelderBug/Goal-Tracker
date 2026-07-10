"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PeriodView } from "@/components/periods/PeriodView";
import { useSettings } from "@/components/data/UserDataProvider";

export default function QuarterPage() {
  const settings = useSettings();
  const router = useRouter();

  useEffect(() => {
    if (!settings.quartersEnabled) router.replace("/");
  }, [settings.quartersEnabled, router]);

  if (!settings.quartersEnabled) return null;
  return <PeriodView period="quarter" />;
}
