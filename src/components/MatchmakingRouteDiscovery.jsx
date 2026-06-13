import React, { useEffect, useMemo, useRef, useState } from "react";

const GRID_COLS = 10;
const GRID_ROWS = 5;
const CELL = 44;

export default function MatchmakingRouteDiscovery() {
  const [visited, setVisited] = useState([]);
  const [isFound, setIsFound] = useState(false);
  const [searchCount, setSearchCount] = useState(0);
  const mountedRef = useRef(true);

  const start = useMemo(() => ({ x: 0, y: 2 }), []);
  const end = useMemo(() => ({ x: 9, y: 2 }), []);

  const blocks = useMemo(
    () => [
      "2-1",
      "2-2",
      "3-3",
      "4-1",
      "5-2",
      "6-1",
      "6-3",
      "7-2",
      "8-1",
      "8-3",
    ],
    []
  );

  const key = (x, y) => `${x}-${y}`;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  useEffect(() => {
    mountedRef.current = true;

    const runAnimation = async () => {
      while (mountedRef.current) {
        setVisited([]);
        setIsFound(false);

        const seen = new Set();
        const active = [];

        const shuffleDirections = () => {
          const dirs = [[1, 0], [0, 1], [0, -1], [-1, 0]];
          return dirs.sort(() => Math.random() - 0.5);
        };

        const explore = async (x, y) => {
          if (!mountedRef.current) return false;
          if (x < 0 || y < 0 || x >= GRID_COLS || y >= GRID_ROWS) return false;
          if (blocks.includes(key(x, y))) return false;
          if (seen.has(key(x, y))) return false;

          seen.add(key(x, y));
          active.push({ x, y, type: "forward" });
          setVisited([...active]);
          await sleep(55);

          if (x === end.x && y === end.y) {
            setIsFound(true);
            setSearchCount((prev) => prev + 1);
            return true;
          }

          const dirs = shuffleDirections();
          for (const [dx, dy] of dirs) {
            const found = await explore(x + dx, y + dy);
            if (found) return true;
          }

          active.push({ x, y, type: "backtrack" });
          setVisited([...active]);
          await sleep(20);

          active.pop();
          active.pop();
          setVisited([...active]);
          return false;
        };

        await explore(start.x, start.y);
        if (mountedRef.current) await sleep(1800);
      }
    };

    runAnimation();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const elapsedTime = useMemo(() => {
    const mins = Math.floor(searchCount * 0.8);
    const secs = (searchCount * 7) % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [searchCount]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "560px",
        margin: "0 auto",
        fontFamily: "'Inter', 'SF Mono', monospace",
        background: "#0A0A0A",
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.5)",
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Status Dot */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: isFound ? "#00FF85" : "#FF453A",
                boxShadow: isFound
                  ? "0 0 6px rgba(0, 255, 133, 0.5)"
                  : "0 0 6px rgba(255, 69, 58, 0.5)",
              }}
            />
            <span
              style={{
                fontSize: "10px",
                fontWeight: "500",
                color: "#A1A1A6",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {isFound ? "Discovered" : "Searching"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span
            style={{
              fontSize: "10px",
              color: "#666",
              fontFamily: "'SF Mono', monospace",
              letterSpacing: "0.04em",
            }}
          >
            DFS
          </span>
          <span
            style={{
              fontSize: "10px",
              color: "#666",
              fontFamily: "'SF Mono', monospace",
              letterSpacing: "0.04em",
            }}
          >
            {GRID_COLS}×{GRID_ROWS}
          </span>
          <span
            style={{
              fontSize: "10px",
              color: "#888",
              fontFamily: "'SF Mono', monospace",
              letterSpacing: "0.04em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {elapsedTime}
          </span>
        </div>
      </div>

      {/* Grid Container */}
      <div
        style={{
          padding: "20px",
          display: "flex",
          justifyContent: "center",
          background: "#0A0A0A",
        }}
      >
        <div
          style={{
            position: "relative",
            width: GRID_COLS * CELL,
            height: GRID_ROWS * CELL,
            background: "#0D0D0D",
            borderRadius: "4px",
            border: "1px solid rgba(255, 255, 255, 0.04)",
            overflow: "hidden",
          }}
        >
          {/* Dot Grid Background */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.03) 0.5px, transparent 0.5px)",
              backgroundSize: `${CELL/4}px ${CELL/4}px`,
            }}
          />

          {/* Grid Lines */}
          {Array.from({ length: GRID_COLS + 1 }).map((_, i) => (
            <div
              key={`v-${i}`}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: i * CELL,
                width: "0.5px",
                background: "rgba(255, 255, 255, 0.04)",
              }}
            />
          ))}
          {Array.from({ length: GRID_ROWS + 1 }).map((_, i) => (
            <div
              key={`h-${i}`}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: i * CELL,
                height: "0.5px",
                background: "rgba(255, 255, 255, 0.04)",
              }}
            />
          ))}

          {/* Obstacle Blocks */}
          {blocks.map((b) => {
            const [x, y] = b.split("-").map(Number);
            return (
              <div
                key={b}
                style={{
                  position: "absolute",
                  left: x * CELL + 1,
                  top: y * CELL + 1,
                  width: CELL - 2,
                  height: CELL - 2,
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: "1px",
                  border: "0.5px solid rgba(255, 255, 255, 0.03)",
                }}
              />
            );
          })}

          {/* Path Lines - SVG */}
          <svg
            style={{
              position: "absolute",
              inset: 0,
              width: GRID_COLS * CELL,
              height: GRID_ROWS * CELL,
            }}
          >
            {visited.map((point, i) => {
              if (i === 0) return null;
              const prev = visited[i - 1];
              return (
                <line
                  key={`line-${i}`}
                  x1={prev.x * CELL + CELL / 2}
                  y1={prev.y * CELL + CELL / 2}
                  x2={point.x * CELL + CELL / 2}
                  y2={point.y * CELL + CELL / 2}
                  stroke={
                    point.type === "backtrack"
                      ? "rgba(255, 255, 255, 0.06)"
                      : "rgba(255, 255, 255, 0.25)"
                  }
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {/* Path Nodes */}
          {visited.map((node, i) => (
            <div
              key={`node-${i}`}
              style={{
                position: "absolute",
                width: node.type === "backtrack" ? "2px" : "3px",
                height: node.type === "backtrack" ? "2px" : "3px",
                borderRadius: "50%",
                left: node.x * CELL + CELL / 2 - (node.type === "backtrack" ? 1 : 1.5),
                top: node.y * CELL + CELL / 2 - (node.type === "backtrack" ? 1 : 1.5),
                background:
                  node.type === "backtrack"
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(255, 255, 255, 0.9)",
              }}
            />
          ))}

          {/* Start Point */}
          <div
            style={{
              position: "absolute",
              left: start.x * CELL,
              top: start.y * CELL,
              width: CELL,
              height: CELL,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#FFFFFF",
                boxShadow: "0 0 4px rgba(255, 255, 255, 0.4)",
                position: "relative",
                zIndex: 2,
              }}
            />
          </div>

          {/* End Point */}
          <div
            style={{
              position: "absolute",
              left: end.x * CELL,
              top: end.y * CELL,
              width: CELL,
              height: CELL,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: isFound ? "#FFFFFF" : "rgba(255, 255, 255, 0.2)",
                border: `1px solid ${
                  isFound
                    ? "rgba(255, 255, 255, 0.6)"
                    : "rgba(255, 255, 255, 0.15)"
                }`,
                boxShadow: isFound
                  ? "0 0 4px rgba(255, 255, 255, 0.4)"
                  : "none",
                position: "relative",
                zIndex: 2,
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div
        style={{
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          background: "#0A0A0A",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "10px",
              color: "#666",
            }}
          >
            <span
              style={{
                width: "3px",
                height: "3px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.5)",
                display: "inline-block",
              }}
            />
            path
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "10px",
              color: "#666",
            }}
          >
            <span
              style={{
                width: "3px",
                height: "3px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.15)",
                display: "inline-block",
              }}
            />
            backtrack
          </div>
        </div>

        <div
          style={{
            fontSize: "10px",
            color: "#888",
            fontFamily: "'SF Mono', monospace",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "0.04em",
          }}
        >
          searches: {String(searchCount).padStart(3, "0")}
        </div>
      </div>
    </div>
  );
}