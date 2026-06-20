import { useState } from "react";
import BlockchainDashboard from "./components/BlockchainDashboard.jsx";
import JoinScreen from "./components/JoinScreen.jsx";
import { useChatSocket } from "./hooks/useChatSocket.js";

export default function App() {
  const [session, setSession] = useState(null); // { name, key }
  const data = useChatSocket(session?.name, session?.key);

  const handleJoin = (nombre) => {
    setSession((prev) => ({ name: nombre, key: (prev?.key ?? 0) + 1 }));
  };

  if (!session || data.connectionStatus === "disconnected") {
    return (
      <JoinScreen
        onJoin={handleJoin}
        error={data.joinError}
        connecting={Boolean(session) && data.connectionStatus === "connecting"}
      />
    );
  }

  return <BlockchainDashboard {...data} />;
}
