import { useEffect, useMemo, useRef, useState } from "react";

let messageId = 0;

const flowDefaults = {
  age: "",
  carModel: "Sedan",
  coverage: "USD 100,000",
};

const formatChatTime = () =>
  new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

const createMessage = (payload) => ({
  id: ++messageId,
  time: formatChatTime(),
  entering: true,
  ...payload,
});

const createAssistantButtonMessage = () =>
  createMessage({
    sender: "ai",
    kind: "ctaButtons",
    agentName: "Ignite Agent",
    title: "Choose your service assistant",
    text: "Select one quick action below to continue.",
    cta1Label: "AI sales assistant",
    cta2Label: "Business Processing Assistant",
  });

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

function Icon({ children, viewBox = "0 0 24 24" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

function App() {
  const [messages, setMessages] = useState(() => [createAssistantButtonMessage()]);
  const [mode, setMode] = useState("idle");
  const [draft, setDraft] = useState("");
  const [flowData, setFlowData] = useState({ ...flowDefaults });
  const [flowMounted, setFlowMounted] = useState(false);
  const [flowVisible, setFlowVisible] = useState(false);
  const [typingCount, setTypingCount] = useState(0);
  const chatViewportRef = useRef(null);
  const timerBucketRef = useRef([]);

  const isTyping = typingCount > 0;
  const canSend = mode === "unstructured" && draft.trim().length > 0;

  const queueTimer = (callback, delay) => {
    const timerId = setTimeout(callback, delay);
    timerBucketRef.current.push(timerId);
  };

  const modeHint = useMemo(() => {
    if (mode === "unstructured") {
      return isTyping
        ? "Advisor is typing..."
        : "AI consultation mode is active.";
    }
    if (mode === "structured") {
      return "Structured mode active. Tap quote card to continue.";
    }
    return "Tap Menu to open quick actions.";
  }, [isTyping, mode]);

  useEffect(() => {
    if (!chatViewportRef.current) {
      return;
    }
    chatViewportRef.current.scrollTo({
      top: chatViewportRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping, flowMounted]);

  useEffect(
    () => () => {
      timerBucketRef.current.forEach((timerId) => clearTimeout(timerId));
      timerBucketRef.current = [];
    },
    [],
  );

  const appendMessage = (payload, options = {}) => {
    const { animate = true } = options;
    const nextMessage = createMessage(payload);

    setMessages((previous) => [
      ...previous,
      { ...nextMessage, entering: animate },
    ]);

    if (animate) {
      queueTimer(() => {
        setMessages((previous) =>
          previous.map((item) =>
            item.id === nextMessage.id ? { ...item, entering: false } : item,
          ),
        );
      }, 260);
    }
  };

  const queueAiMessage = (payload, delay = 950) => {
    setTypingCount((count) => count + 1);
    queueTimer(() => {
      setTypingCount((count) => Math.max(0, count - 1));
      appendMessage({
        sender: "ai",
        ...payload,
      });
    }, delay);
  };

  const handleSelectUnstructured = () => {
    setMode("unstructured");
    appendMessage(
      {
        sender: "system",
        kind: "system",
        text: "已切换至 AI 咨询模式",
      },
      { animate: true },
    );
  };

  const handleSelectStructured = () => {
    setMode("structured");
    appendMessage({
      sender: "ai",
      kind: "quoteCard",
      title: "业务办理助手 (Structured)",
      description: "保单查询、报价、理赔",
      buttonLabel: "立即报价",
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

    queueAiMessage(
      {
        kind: "text",
        text: getAdvisoryReply(cleanedText),
      },
      1350,
    );
  };

  const handleFlowChange = (event) => {
    const { name, value } = event.target;
    setFlowData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openFlow = () => {
    setFlowMounted(true);
    queueTimer(() => setFlowVisible(true), 16);
  };

  const showAssistantButtons = () => {
    appendMessage({
      sender: "ai",
      kind: "ctaButtons",
      agentName: "Ignite Agent",
      title: "Choose your service assistant",
      text: "Select one quick action below to continue.",
      cta1Label: "AI sales assistant",
      cta2Label: "Business Processing Assistant",
    });
  };

  const closeFlow = () => {
    setFlowVisible(false);
    queueTimer(() => setFlowMounted(false), 300);
  };

  const handleFlowSubmit = (event) => {
    event.preventDefault();
    closeFlow();
    queueAiMessage(
      {
        kind: "text",
        text: `报价请求已提交：年龄 ${flowData.age}，车型 ${flowData.carModel}，保额 ${flowData.coverage}。顾问会尽快联系你。`,
      },
      760,
    );
    setFlowData({ ...flowDefaults });
  };

  const renderMessage = (message) => {
    if (message.kind === "ctaButtons") {
      return (
        <article className="ctaTemplateCard">
          <div className="ctaTemplateBody">
            <span className="listAgent">{message.agentName}</span>
            <h3 className="ctaTitle">{message.title}</h3>
            <p>{message.text}</p>
            <span className="ctaTime">{message.time}</span>
          </div>

          <div className="ctaButtonList">
            <button type="button" className="ctaButtonRow" onClick={handleSelectUnstructured}>
              <span className="ctaButtonIcon" aria-hidden="true">
                ↗
              </span>
              <span>{message.cta1Label}</span>
            </button>

            <button type="button" className="ctaButtonRow" onClick={handleSelectStructured}>
              <span className="ctaButtonIcon" aria-hidden="true">
                ☎
              </span>
              <span>{message.cta2Label}</span>
            </button>
          </div>
        </article>
      );
    }

    if (message.kind === "quoteCard") {
      return (
        <article className="quoteCard">
          <div className="quoteCardTop">
            <span className="quoteTag">WhatsApp Flow</span>
            <h3>{message.title}</h3>
          </div>
          <p>{message.description}</p>
          <button type="button" onClick={openFlow}>
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
              <button type="button" className="headerNavButton" aria-label="Back">
                <Icon>
                  <path
                    d="M14.5 5L8 11.5L14.5 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Icon>
              </button>

              <div className="avatarRing">
                <div className="avatar">AI</div>
              </div>

              <div className="titleStack">
                <h1>Ignite Agent</h1>
                <p>{isTyping ? "typing..." : "online"}</p>
              </div>

              <div className="headerActions">
                <button type="button" className="headerIconButton" aria-label="Video call">
                  <Icon>
                    <path
                      d="M3.5 7.5C3.5 6.4 4.4 5.5 5.5 5.5H12.5C13.6 5.5 14.5 6.4 14.5 7.5V16.5C14.5 17.6 13.6 18.5 12.5 18.5H5.5C4.4 18.5 3.5 17.6 3.5 16.5V7.5Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="M14.5 10L19.5 7.5V16.5L14.5 14"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </Icon>
                </button>
                <button type="button" className="headerIconButton" aria-label="Call">
                  <Icon>
                    <path
                      d="M7.2 4.6L9.1 6.5C9.7 7.1 9.9 8 9.5 8.7L8.8 10C9.8 12.1 11.5 13.9 13.7 15L15 14.3C15.8 13.9 16.7 14.1 17.3 14.7L19.2 16.6C19.8 17.2 20 18.1 19.5 18.9C18.7 20.3 17 21 15.4 20.6C9.4 19.3 4.6 14.5 3.2 8.4C2.8 6.8 3.5 5.1 4.9 4.3C5.7 3.8 6.6 4 7.2 4.6Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Icon>
                </button>
                <button type="button" className="headerIconButton" aria-label="More actions">
                  <Icon viewBox="0 0 24 24">
                    <circle cx="12" cy="5.5" r="1.6" fill="currentColor" />
                    <circle cx="12" cy="12" r="1.6" fill="currentColor" />
                    <circle cx="12" cy="18.5" r="1.6" fill="currentColor" />
                  </Icon>
                </button>
              </div>
            </div>
          </header>

          <main className="chatViewport" ref={chatViewportRef}>
            <div className="dateBadge">Today</div>
            <div className="encryptionBanner">
              <Icon>
                <rect
                  x="7"
                  y="11"
                  width="10"
                  height="8"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M9.5 11V8.8C9.5 7.1 10.9 5.8 12.5 5.8C14.1 5.8 15.5 7.1 15.5 8.8V11"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
              </Icon>
              Messages and calls are end-to-end encrypted.
            </div>

            {messages.length === 0 ? (
              <div className="emptyState">
                <p>Tap Menu to choose assistant mode.</p>
              </div>
            ) : (
              messages.map((message) => (
                message.kind === "system" ? (
                  <div
                    key={message.id}
                    className={`messageRow systemRow ${
                      message.entering ? "messageEntering" : ""
                    }`}
                  >
                    <span className="systemNotice">{message.text}</span>
                  </div>
                ) : (
                  <div
                    key={message.id}
                    className={`messageRow ${
                      message.sender === "user" ? "userRow" : "aiRow"
                    } ${message.entering ? "messageEntering" : ""}`}
                  >
                    <div
                      className={`bubble ${
                        message.sender === "user" ? "userBubble" : "aiBubble"
                      }`}
                    >
                      {renderMessage(message)}
                      {message.kind === "text" ? (
                        <div
                          className={`messageMeta ${
                            message.sender === "user" ? "userMeta" : "aiMeta"
                          }`}
                        >
                          <span>{message.time}</span>
                          {message.sender === "user" ? (
                            <span className="doubleCheck">
                              <Icon viewBox="0 0 16 16">
                                <path
                                  d="M2.4 8.4L5.1 11L8.4 7.6M6.8 8.3L9.5 11L13.6 6.8"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </Icon>
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              ))
            )}

            {isTyping ? (
              <div className="messageRow aiRow typingRow">
                <div className="bubble aiBubble typingBubble">
                  <div className="typingDots" aria-label="AI is typing">
                    <span className="typingDot" />
                    <span className="typingDot" />
                    <span className="typingDot" />
                  </div>
                </div>
              </div>
            ) : null}
          </main>

          <footer className="chatComposer">
            <button
              type="button"
              className="menuButton"
              onClick={showAssistantButtons}
            >
              Menu
            </button>

            {mode === "unstructured" ? (
              <div className="inputDock">
                <button type="button" className="composerIcon" aria-label="Emoji">
                  <Icon>
                    <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.6" />
                    <path
                      d="M9.2 14.6C10 15.5 11 16 12.1 16C13.2 16 14.2 15.5 15 14.6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <circle cx="9.5" cy="10.2" r="0.9" fill="currentColor" />
                    <circle cx="14.5" cy="10.2" r="0.9" fill="currentColor" />
                  </Icon>
                </button>

                <input
                  aria-label="Type your message"
                  className="sendTextInput"
                  placeholder="Ask about insurance plans..."
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />

                <button type="button" className="composerIcon" aria-label="Attach file">
                  <Icon>
                    <path
                      d="M8.5 12.6L13.7 7.4C15 6.2 17 6.2 18.2 7.4C19.4 8.6 19.4 10.6 18.2 11.8L11.7 18.3C9.7 20.3 6.4 20.3 4.4 18.3C2.4 16.3 2.4 13 4.4 11L10.1 5.3"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Icon>
                </button>
              </div>
            ) : (
              <div className="modeHint">{modeHint}</div>
            )}

            <button
              type="button"
              className={`actionButton ${canSend ? "canSend" : ""}`}
              onClick={canSend ? handleSendMessage : undefined}
              aria-label={canSend ? "Send message" : "Record voice message"}
            >
              {canSend ? (
                <Icon>
                  <path
                    d="M4 12L20 4L14 20L11.3 13.8L4 12Z"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    strokeLinejoin="round"
                  />
                </Icon>
              ) : (
                <Icon>
                  <path
                    d="M12 4.5C10.3 4.5 8.9 5.9 8.9 7.6V12.1C8.9 13.8 10.3 15.2 12 15.2C13.7 15.2 15.1 13.8 15.1 12.1V7.6C15.1 5.9 13.7 4.5 12 4.5Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <path
                    d="M6.8 11.8C6.8 14.6 9.1 16.9 12 16.9C14.9 16.9 17.2 14.6 17.2 11.8"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 16.9V20"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </Icon>
              )}
            </button>
          </footer>

          {flowMounted ? (
            <section
              className={`flowOverlay ${flowVisible ? "flowVisible" : ""}`}
              aria-modal="true"
              role="dialog"
            >
              <div className="flowSheet">
                <header className="flowHeader">
                  <span className="flowHandle" />
                  <div className="flowHeaderBar">
                    <button
                      type="button"
                      className="flowCloseButton"
                      onClick={closeFlow}
                      aria-label="Close flow"
                    >
                      <Icon>
                        <path
                          d="M18 8L12 14L6 8"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Icon>
                    </button>
                    <div>
                      <h2 className="flowTitle">立即报价</h2>
                      <p className="flowCaption">WhatsApp Flow</p>
                    </div>
                  </div>
                </header>

                <form className="flowForm" onSubmit={handleFlowSubmit}>
                  <section className="flowSection">
                    <h3 className="flowSectionTitle">Policy details</h3>

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
                  </section>

                  <button type="submit" className="flowSubmit">
                    Submit Quote Request
                  </button>
                </form>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default App;
