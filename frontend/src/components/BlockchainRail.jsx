import { useRef, useEffect } from "react";
import "./BlockchainRail.css";

/* ── Individual block tile ────────────────────────────────────── */
function BlockTile({ block, index }) {
  return (
    <div
      className={`block-tile block-tile--${block.status} anim-pixel-enter`}
      style={{ animationDelay: `${index * 70}ms` }}
      role="listitem"
      aria-label={`Bloque ${block.id}: estado ${block.status}`}
    >
      {/* Chain connector (left) */}
      {index > 0 && (
        <div className="block-connector" aria-hidden="true" />
      )}

      <div className="block-inner">
        <div className="block-id">#{block.id}</div>
        <div className="block-hash" title={block.hash}>
          {block.hash.slice(0, 8)}
        </div>
        <div className="block-time">{block.timestamp}</div>
        {block.proposer && (
          <div className="block-proposer">{block.proposer.slice(0, 5)}</div>
        )}
        {block.status === "pending" && (
          <div className="block-pending-dots" aria-hidden="true">···</div>
        )}
      </div>
    </div>
  );
}

/* ── BlockchainRail ───────────────────────────────────────────── */
export default function BlockchainRail({ blocks }) {
  const railRef = useRef(null);

  /* Auto-scroll to latest block */
  useEffect(() => {
    const el = railRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [blocks.length]);

  return (
    <section className="blockchain-rail panel--crt" aria-label="Cadena de bloques">
      <div className="rail-header">
        <span className="rail-title">BLOCKCHAIN</span>
        <span className="rail-count">{blocks.length} BLOQUES</span>
      </div>

      <div
        className="rail-scroll"
        ref={railRef}
        role="list"
        aria-label="Bloques en la cadena"
      >
        {blocks.map((block, i) => (
          <BlockTile key={block.id} block={block} index={i} />
        ))}
      </div>

      {/* Status legend */}
      <div className="rail-legend" aria-label="Leyenda de estados">
        <span className="legend-item legend-item--propagating">PROPAGATING</span>
        <span className="legend-item legend-item--validated">VALIDATED</span>
        <span className="legend-item legend-item--pending">PENDING</span>
        <span className="legend-item legend-item--forked">FORKED</span>
      </div>
    </section>
  );
}
