"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TodosRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/waiting");
  }, [router]);

  return null;
}
