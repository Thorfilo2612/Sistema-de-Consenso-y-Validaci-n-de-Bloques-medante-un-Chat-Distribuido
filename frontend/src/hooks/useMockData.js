import { useState, useCallback } from "react";
import {
  mockMessages,
  mockUsers,
  mockConsensus,
  mockBlocks,
  mockValidationEvents,
  mockNodeHealth,
  CURRENT_USER,
  CONNECTION_STATUS,
} from "../data/mockData.js";

function nowTime() {
  return new Date().toLocaleTimeString("es-VE", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function useMockData() {
  const [messages, setMessages] = useState(mockMessages);
  const [users] = useState(mockUsers);
  const [consensus] = useState(mockConsensus);
  const [blocks] = useState(mockBlocks);
  const [validationEvents] = useState(mockValidationEvents);
  const [nodeHealth] = useState(mockNodeHealth);

  const sendMessage = useCallback(
    (text) => {
      const ts = nowTime();
      const trimmed = text.trim();
      if (!trimmed) return;

      if (trimmed.startsWith("/w ")) {
        const rest = trimmed.slice(3);
        const spaceIdx = rest.indexOf(" ");
        if (spaceIdx === -1) return;
        const to = rest.slice(0, spaceIdx);
        const body = rest.slice(spaceIdx + 1).trim();
        if (!body) return;
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: "private",
            from: CURRENT_USER,
            to,
            text: body,
            timestamp: ts,
            own: true,
          },
        ]);
      } else if (trimmed === "/list") {
        const names = users.map((u) => u.name).join(", ");
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: "system",
            text: `Nodos en red: ${names}`,
            timestamp: ts,
          },
        ]);
      } else if (trimmed === "/quit") {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: "system",
            text: "Desconectando de la red...",
            timestamp: ts,
          },
        ]);
      } else {
        const body = trimmed.startsWith("/broadcast ")
          ? trimmed.slice(11).trim()
          : trimmed;
        if (!body) return;
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: "broadcast",
            from: CURRENT_USER,
            text: body,
            timestamp: ts,
            own: true,
          },
        ]);
      }
    },
    [users]
  );

  return {
    messages,
    users,
    currentUser: CURRENT_USER,
    connectionStatus: CONNECTION_STATUS,
    sendMessage,
    consensus,
    blocks,
    validationEvents,
    nodeHealth,
  };
}
