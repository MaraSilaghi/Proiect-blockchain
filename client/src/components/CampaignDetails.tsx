import { useParams } from "react-router-dom";
import { useCampaigns } from "../contexts/CampaignsContext";
import backgroundImg from "../assets/background.png";

const CampaignDetails = () => {
  const { id } = useParams();
  const { campaigns, isCampaignsLoading, campaignsError } = useCampaigns();

  if (isCampaignsLoading) {
    return <p>Loading...</p>;
  }
  if (campaignsError) {
    return <p>There was an error loading the campaigns.</p>;
  }
  const campaign = campaigns.find((campaign, index) => index === Number(id));

  if (!campaign) {
    return <p>Campaign not found.</p>;
  }


  return (
    <div style={{
        backgroundImage: `url(${backgroundImg})`,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        backgroundPosition: "center",
        minHeight: "100vh",
        paddingTop: "2.5rem",
        paddingBottom: "2.5rem",
      }}>
        <div className="campaign-details-container">
        <img
            className="campaign-image"
            src={campaign.imageIPFSHash ? `https://ipfs.io/ipfs/${campaign.imageIPFSHash}` : "https://via.placeholder.com/200"}
            alt={campaign.title}
        />
        <div className="campaign-content">
            <div className="campaign-left">
            <h2 style={{fontSize:"26px", fontWeight:"bold", marginBottom:"1.5rem"}}>{campaign.title}</h2>
            <div>
            <p>Created by: </p>
                <p style={{color: "rgb(196, 169, 174)", marginBottom:"1rem"}}>{campaign.owner}</p>
                <h2>Description: </h2>
            <p style={{color: "rgb(196, 169, 174)", marginBottom:"1rem"}}>{campaign.description}</p>
            <h3>Donators</h3>
            <ul style={{color: "rgb(196, 169, 174)", marginBottom:"1rem"}}>
                {campaign.donators.length > 0 ? campaign.donators.map((donator, index) => (
                <li key={index}>{donator}</li>
                )) : <li>No donators yet.</li>}
            </ul>
            </div>
            </div>
            <div className="campaign-right">
            <div className="metric-box">
                <h4>Days Left</h4>
                <p>{campaign.daysLeft}</p>
            </div>
            <div className="metric-box">
                <h4>Raised</h4>
                <p>{campaign.collectedInEth > 0 ? campaign.collectedInEth : "0.00"} / {campaign.targetInETH} ETH</p>
            </div>
            <div className="metric-box">
                <h4>Number of Donators</h4>
                <p>{campaign.donators.length}</p>
            </div>
            </div>
        </div>
        </div>
    </div>
  );
};

export default CampaignDetails;