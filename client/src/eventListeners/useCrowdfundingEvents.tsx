import { useEffect, useRef } from "react";
import { SmartContract } from "@thirdweb-dev/react"; 

type OnCreated = (data: { id: any; owner: string; title: string }) => void;
type OnEdited = (data: { id: any; newTitle: string; newDescription: string }) => void;
type OnDonation = (data: {
  campaignId: any;
  donator: string;
  amount: any;
  donatorShare: any;
}) => void;
type OnWithdrawal = (data: { campaignId: any; owner: string; amount: any }) => void;

export function useCrowdfundingEvents(
  contract: SmartContract | undefined,
  onCreated?: OnCreated,
  onEdited?: OnEdited,
  onDonation?: OnDonation,
  onWithdrawal?: OnWithdrawal
) {
  const attachedRef = useRef(false);

  useEffect(() => {
    if (!contract) return;
    if (attachedRef.current) return;
    attachedRef.current = true;

    const handleCreated = (event: any) => {
      const { id, owner, title } = event.data;
      console.log(`[Event] CampaignCreated => id=${id.toString()}, owner=${owner}, title=${title}`);
      onCreated?.({ id, owner, title });
    };

    const handleEdited = (event: any) => {
      const { id, newTitle, newDescription } = event.data;
      console.log(`[Event] CampaignEdited => id=${id.toString()}, newTitle=${newTitle}, newDescription=${newDescription}`);
      onEdited?.({ id, newTitle, newDescription });
    };

    const handleDonation = (event: any) => {
      const { campaignId, donator, amount, donatorShare } = event.data;
      console.log(`[Event] DonationReceived => campaignId=${campaignId.toString()}, donator=${donator}, amount=${amount.toString()}, donatorShare=${donatorShare.toString()}`);
      onDonation?.({ campaignId, donator, amount, donatorShare });
    };

    const handleWithdrawal = (event: any) => {
      const { campaignId, owner, amount } = event.data;
      console.log(`[Event] Withdrawal => campaignId=${campaignId.toString()}, owner=${owner}, amount=${amount.toString()}`);
      onWithdrawal?.({ campaignId, owner, amount });
    };

    contract.events.addEventListener("CampaignCreated", handleCreated);
    contract.events.addEventListener("CampaignEdited", handleEdited);
    contract.events.addEventListener("DonationReceived", handleDonation);
    contract.events.addEventListener("Withdrawal", handleWithdrawal);

    return () => {
      contract.events.removeEventListener("CampaignCreated", handleCreated);
      contract.events.removeEventListener("CampaignEdited", handleEdited);
      contract.events.removeEventListener("DonationReceived", handleDonation);
      contract.events.removeEventListener("Withdrawal", handleWithdrawal);
    };
  }, [contract, onCreated, onEdited, onDonation, onWithdrawal]);
}
