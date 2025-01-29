import { useEffect } from "react";
import { SmartContract } from "@thirdweb-dev/react"; 
import { useRef } from "react";

type OnCreated = (data: { id: any; owner: string; title: string }) => void;
type OnEdited = (data: { id: any; newTitle: string; newDescription: string }) => void;
type OnDeleted = (data: { id: any; owner: string }) => void;
type OnDonation = (data: {
  campaignId: any;
  donator: string;
  amount: any;
  donatorShare: any;
}) => void;

export function useCrowdfundingEvents(
  contract: SmartContract | undefined,
  onCreated?: OnCreated,
  onEdited?: OnEdited,
  onDeleted?: OnDeleted,
  onDonation?: OnDonation
) {
  const attachedRef = useRef(false);
  useEffect(() => {
    if (!contract) return;
    if (attachedRef.current) return;
    attachedRef.current = true;
    const handleCreated = (event: any) => {
      const { id, owner, title } = event.data;
      window.alert(`EventListener: CampaignCreated => id=${id.toString()} | owner=${owner} | title=${title}`);
      onCreated?.({ id, owner, title });
    };

    const handleEdited = (event: any) => {
      const { id, newTitle, newDescription } = event.data;
      window.alert(
        `EventListener: CampaignEdited => id=${id.toString()} | newTitle=${newTitle} | newDescription=${newDescription}`
      );
      onEdited?.({ id, newTitle, newDescription });
    };

    const handleDeleted = (event: any) => {
      const { id, owner } = event.data;
      window.alert(`EventListener: CampaignDeleted => id=${id.toString()} | owner=${owner}`);
      onDeleted?.({ id, owner });
    };

    const handleDonation = (event: any) => {
      const { campaignId, donator, amount, donatorShare } = event.data;
      window.alert(
        `EventListener: DonationReceived => campaignId=${campaignId.toString()} | donator=${donator} | amount=${amount.toString()} | donatorShare=${donatorShare.toString()}`
      );
      onDonation?.({ campaignId, donator, amount, donatorShare });
    };

    contract.events.addEventListener("CampaignCreated", handleCreated);
    contract.events.addEventListener("CampaignEdited", handleEdited);
    contract.events.addEventListener("CampaignDeleted", handleDeleted);
    contract.events.addEventListener("DonationReceived", handleDonation);

    return () => {
      contract.events.removeEventListener("CampaignCreated", handleCreated);
      contract.events.removeEventListener("CampaignEdited", handleEdited);
      contract.events.removeEventListener("CampaignDeleted", handleDeleted);
      contract.events.removeEventListener("DonationReceived", handleDonation);
    };
  }, [contract, onCreated, onEdited, onDeleted, onDonation]);
}
