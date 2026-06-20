import { useState } from "react";
import StatusSpine from "./StatusSpine.jsx";
import Header from "./Header.jsx";
import NodeGrid from "./NodeGrid.jsx";
import BlockchainRail from "./BlockchainRail.jsx";
import ConsensusPanel from "./ConsensusPanel.jsx";
import ValidationFeed from "./ValidationFeed.jsx";
import InputBar from "./InputBar.jsx";
import "./BlockchainDashboard.css";

export default function BlockchainDashboard({
  messages,
  users,
  currentUser,
  connectionStatus,
  sendMessage,
  consensus,
  blocks,
  validationEvents,
  nodeHealth,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className={`blockchain-dashboard${sidebarOpen ? "" : " sidebar-closed"}`}>
      {/* Row 1: App header — brand, node identity, clock */}
      <Header
        currentUser={currentUser}
        connectionStatus={connectionStatus}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        sidebarOpen={sidebarOpen}
      />

      {/* Row 2: Three-column body */}
      <main className="dashboard-body">
        {/* Left: node status grid */}
        <NodeGrid
          users={users}
          currentUser={currentUser}
          nodeHealth={nodeHealth}
        />

        {/* Center: blockchain rail + consensus panel */}
        <section className="center-column">
          <BlockchainRail blocks={blocks} />
          <ConsensusPanel consensus={consensus} users={users} />
        </section>

        {/* Right: unified activity feed */}
        <ValidationFeed
          validationEvents={validationEvents}
          messages={messages}
        />
      </main>

      {/* Row 3: Message input */}
      <InputBar onSend={sendMessage} connectionStatus={connectionStatus} />

      {/* Row 4: Consensus status spine — pinned to bottom */}
      <StatusSpine
        round={consensus.round}
        leader={consensus.leader}
        votes={consensus.receivedVotes}
        totalVotes={consensus.totalVotes}
        phase={consensus.phase}
      />
    </div>
  );
}
