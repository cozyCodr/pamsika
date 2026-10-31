import { config } from "@/lib/config";
import { devdraftReadiness } from "@/lib/devdraft";
import { getStall, latestStallWithItems, priceWatch } from "@/lib/queries";
import { StageView } from "./StageView";

export const dynamic = "force-dynamic";

export default async function Stage({ searchParams }: { searchParams: Promise<{ stall?: string }> }) {
  const { stall: stallParam } = await searchParams;
  const stall = (stallParam && getStall(stallParam)) || latestStallWithItems() || null;
  return (
    <StageView
      stall={stall ? { id: stall.id, name: stall.name, market: stall.market } : null}
      publicBaseUrl={config.publicBaseUrl}
      live={(await devdraftReadiness()).ok}
      mock={config.devdraftMock}
      prices={priceWatch()}
    />
  );
}
