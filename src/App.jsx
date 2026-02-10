import { useEffect, useMemo, useRef, useState } from "react";

let messageId = 0;

const createMessage = (payload) => ({
  id: ++messageId,
  ...payload,
});

const flowDefaults = {
  age: "",
  carModel: "Sedan",
  coverage: "USD 100,000",
};

const getAdvisoryReply = (question) => {
  const lowerQuestion = question.toLowerCase();
  const asksComparison =
    lowerQuestion.includes("compare") ||
    (lowerQuestion.includes("plan a") && lowerQuestion.includes("plan b"));

  if (asksComparison) {
    return `Great question. Here is a practical comparison:

Plan A
- Lower premium and easier entry.
- Covers standard collision and third-party liability.
- Best for cost-sensitive customers with moderate annual mileage.

Plan B
- Higher premium but broader protection.
- Adds roadside assistance, replacement car, and zero-depreciation options.
- Better for newer vehicles or drivers seeking stronger claim certainty.

Sales recommendation:
If your top priority is monthly affordability, start with Plan A.
If you want better claim outcomes and less out-of-pocket risk, Plan B is usually the stronger value over 12 months.`;
  }

  return `Thanks for the detailed question. A safe way to evaluate policy wording is:
1) confirm exclusions and waiting periods,
2) compare deductible impact per claim,
3) model premium vs. expected annual usage.

If you share your car type and budget range, I can give a targeted recommendation with trade-offs.`;
};

function App() {
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState("idle");
  const [showMenu, setShowMenu] = useState(false);
  const [draft, setDraft] = useState("");
  const [flowOpen, setFlowOpen] = useState(false);
  const [flowData, setFlowData] = useState(flowDefaults);
  const chatViewportRef = useRef(null);

  const modeHint = useMemo(() => {
    if (mode === "unstructured") {
      return "Natural language mode is active.";
    }
    if (mode === "structured") {
      return "Structured mode active. Open the quote card in chat.";
    }
    return "Tap Menu to choose a mode.";
  }, [mode]);

  useEffect(() => {
    if (!chatViewportRef.current) {
      return;
    }
    chatViewportRef.current.scrollTo({
      top: chatViewportRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, flowOpen]);

  const appendMessage = (payload) => {
    setMessages((previous) => [...previous, createMessage(payload)]);
  };

  const handleSelectUnstructured = () => {
    setMode("unstructured");
    setShowMenu(false);
    appendMessage({
      sender: "ai",
      kind: "text",
      text: "Hello, I am your AI insurance advisor. Ask me anything about policy terms, exclusions, or plan comparisons.",
    });
  };

  const handleSelectStructured = () => {
    setMode("structured");
    setShowMenu(false);
    appendMessage({
      sender: "ai",
      kind: "quoteCard",
      title: "Start Quote",
      description:
        "Use the guided flow to collect age, vehicle type, and desired coverage amount.",
      buttonLabel: "Get Quote",
    });
  };

  const handleSendMessage = () => {
    const cleanedText = draft.trim();
    if (!cleanedText || mode !== "unstructured") {
      return;
    }

    appendMessage({
      sender: "user",
      kind: "text",
      text: cleanedText,
    });
    setDraft("");

    appendMessage({
      sender: "ai",
      kind: "text",
      text: getAdvisoryReply(cleanedText),
    });
  };

  const handleFlowChange = (event) => {
    const { name, value } = event.target;
    setFlowData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleFlowSubmit = (event) => {
    event.preventDefault();
    setFlowOpen(false);

    appendMessage({
      sender: "ai",
      kind: "text",
      text: `Quote request submitted for age ${flowData.age}, ${flowData.carModel}, coverage ${flowData.coverage}. A licensed advisor will contact you shortly with pricing options.`,
    });
    setFlowData(flowDefaults);
  };

  const renderMessage = (message) => {
    if (message.kind === "quoteCard") {
      return (
        <article className="quoteCard">
          <h3>{message.title}</h3>
          <p>{message.description}</p>
          <button type="button" onClick={() => setFlowOpen(true)}>
            {message.buttonLabel}
          </button>
        </article>
      );
    }

    return <p>{message.text}</p>;
  };

  return (
    <div className="appShell">
      <div className="iphoneFrame">
        <div className="dynamicIsland" />
        <div className="screen">
          <header className="chatHeader">
            <div className="statusLine">
              <span>9:41</span>
              <span>5G ▮▮▮ 100%</span>
            </div>
            <div className="conversationMeta">
              <div className="avatar">AI</div>
              <div>
                <h1>Insurance Advisor</h1>
                <p>online</p>
              </div>
            </div>
          </header>

          <main className="chatViewport" ref={chatViewportRef}>
            <div className="dateBadge">Today</div>
            {messages.length === 0 ? (
              <div className="emptyState">
                <p>Select a mode from Menu to begin.</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`messageRow ${
                    message.sender === "user" ? "userRow" : "aiRow"
                  }`}
                >
                  <div
                    className={`bubble ${
                      message.sender === "user" ? "userBubble" : "aiBubble"
                    }`}
                  >
                    {renderMessage(message)}
                  </div>
                </div>
              ))
            )}
          </main>

          {showMenu ? (
            <section className="menuPopover" aria-label="Mode options">
              <button type="button" onClick={handleSelectUnstructured}>
                Consult AI Advisor (Unstructured)
              </button>
              <button type="button" onClick={handleSelectStructured}>
                Enter Business Service (Structured)
              </button>
            </section>
          ) : null}

          <footer className="chatComposer">
            <button
              type="button"
              className="menuButton"
              onClick={() => setShowMenu((open) => !open)}
            >
              Menu
            </button>

            {mode === "unstructured" ? (
              <>
                <input
                  aria-label="Type your message"
                  placeholder="Ask about insurance plans..."
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSendMessage();
                    }
                  }}
                />
                <button
                  type="button"
                  className="sendButton"
                  onClick={handleSendMessage}
                >
                  Send
                </button>
              </>
            ) : (
              <div className="modeHint">{modeHint}</div>
            )}
          </footer>

          {flowOpen ? (
            <section className="flowOverlay" aria-modal="true" role="dialog">
              <header className="flowHeader">
                <button type="button" onClick={() => setFlowOpen(false)}>
                  Close
                </button>
                <h2>WhatsApp Flow: Get Quote</h2>
              </header>

              <form className="flowForm" onSubmit={handleFlowSubmit}>
                <label>
                  Age
                  <input
                    required
                    min="18"
                    max="99"
                    name="age"
                    type="number"
                    placeholder="e.g. 32"
                    value={flowData.age}
                    onChange={handleFlowChange}
                  />
                </label>

                <label>
                  Vehicle type
                  <select
                    name="carModel"
                    value={flowData.carModel}
                    onChange={handleFlowChange}
                  >
                    <option>Sedan</option>
                    <option>SUV</option>
                    <option>Electric Vehicle</option>
                    <option>Pickup Truck</option>
                  </select>
                </label>

                <label>
                  Coverage amount
                  <select
                    name="coverage"
                    value={flowData.coverage}
                    onChange={handleFlowChange}
                  >
                    <option>USD 50,000</option>
                    <option>USD 100,000</option>
                    <option>USD 200,000</option>
                    <option>USD 500,000</option>
                  </select>
                </label>

                <button type="submit" className="flowSubmit">
                  Submit Quote Request
                </button>
              </form>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default App;
