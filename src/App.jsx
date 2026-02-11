import { useEffect, useMemo, useRef, useState } from "react";

let messageId = 0;

const quoteFormDefaults = {
  age: "",
  coverage: "500k",
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
    title: "Personal Accident service entry",
    text: "Choose one native quick action below.",
    cta1Label: "AI sales assistant",
    cta2Label: "Business Processing Assistant",
  });

const createApplicationDefaults = (occupation = "") => ({
  insuredName: "",
  idPhotoName: "",
  dateOfBirth: "",
  occupation,
  coveragePeriod: "1 year",
});

const getAdvisoryReply = (question) => {
  const lowerQuestion = question.toLowerCase();

  if (lowerQuestion.includes("premium") || lowerQuestion.includes("price")) {
    return "For Personal Accident insurance, a common starter benchmark is around CNY 199 per year for core protection, depending on occupation risk class.";
  }

  if (lowerQuestion.includes("coverage") || lowerQuestion.includes("benefit")) {
    return "The recommended baseline includes death/disability benefit and accidental medical reimbursement. For higher-risk occupations, increasing death/disability coverage to 1,000,000 CNY is often safer.";
  }

  return "For Personal Accident insurance, focus on occupation class, accidental medical limits, and disability payout ratio. If you share your work pattern and exposure, I can suggest a more precise plan.";
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
  const [awaitingOccupation, setAwaitingOccupation] = useState(false);
  const [capturedOccupation, setCapturedOccupation] = useState("");
  const [quoteForm, setQuoteForm] = useState({ ...quoteFormDefaults });
  const [quotePreview, setQuotePreview] = useState(null);
  const [applicationForm, setApplicationForm] = useState(() =>
    createApplicationDefaults(""),
  );
  const [flowStep, setFlowStep] = useState("collect");
  const [paymentState, setPaymentState] = useState("choose");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
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
      return "Structured mode active. Tap View Quote to continue.";
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

  const runLeadQualificationScript = () => {
    setAwaitingOccupation(true);

    appendMessage({
      sender: "system",
      kind: "system",
      text: "Switched to AI consultation mode.",
    });

    queueAiMessage(
      {
        kind: "text",
        text: "To tailor a Personal Accident plan, what is your occupation?",
      },
      650,
    );
  };

  const showLeadTransfer = (occupation) => {
    const normalizedOccupation = occupation.trim();

    queueTimer(() => {
      appendMessage({
        sender: "system",
        kind: "system",
        text: "[System captured a high-intent lead and transferred to Agent]",
      });
    }, 420);

    queueTimer(() => {
      appendMessage({
        sender: "agent",
        kind: "text",
        text: `I am your advisor. This is a Personal Accident plan tailored for your occupation (${normalizedOccupation}). Please review it.`,
      });
    }, 1000);

    queueTimer(() => {
      appendMessage({
        sender: "agent",
        kind: "quoteCard",
        title: "Personal Accident Quote",
        description: `${normalizedOccupation} protection package`,
        buttonLabel: "View Quote",
      });
    }, 1450);
  };

  const handleSelectUnstructured = () => {
    setMode("unstructured");
    setCapturedOccupation("");
    runLeadQualificationScript();
  };

  const handleSelectStructured = () => {
    setMode("structured");
    appendMessage({
      sender: "ai",
      kind: "quoteCard",
      title: "Personal Accident Quote Sheet",
      description: "Policy search, quote, and claims",
      buttonLabel: "View Quote",
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

    if (awaitingOccupation) {
      setAwaitingOccupation(false);
      setCapturedOccupation(cleanedText);
      showLeadTransfer(cleanedText);
      return;
    }

    queueAiMessage(
      {
        kind: "text",
        text: getAdvisoryReply(cleanedText),
      },
      1350,
    );
  };

  const handleQuoteFormChange = (event) => {
    const { name, value } = event.target;
    setQuoteForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openFlow = () => {
    setFlowStep("collect");
    setQuoteForm({ ...quoteFormDefaults });
    setQuotePreview(null);
    setApplicationForm(createApplicationDefaults(capturedOccupation));
    setPaymentState("choose");
    setSelectedPaymentMethod("");
    setFlowMounted(true);
    queueTimer(() => setFlowVisible(true), 16);
  };

  const showAssistantButtons = () => {
    appendMessage({
      sender: "ai",
      kind: "ctaButtons",
      agentName: "Ignite Agent",
      title: "Personal Accident service entry",
      text: "Choose one native quick action below.",
      cta1Label: "AI sales assistant",
      cta2Label: "Business Processing Assistant",
    });
  };

  const closeFlow = () => {
    setFlowVisible(false);
    queueTimer(() => {
      setFlowMounted(false);
      setFlowStep("collect");
      setQuoteForm({ ...quoteFormDefaults });
      setQuotePreview(null);
      setApplicationForm(createApplicationDefaults(capturedOccupation));
      setPaymentState("choose");
      setSelectedPaymentMethod("");
    }, 300);
  };

  const handleGeneratePreview = (event) => {
    event.preventDefault();
    if (!quoteForm.age.trim()) {
      return;
    }

    setQuotePreview({
      age: quoteForm.age.trim(),
      coverage: quoteForm.coverage,
      price: 199,
    });
    setFlowStep("quote");
  };

  const handleContinueToApplication = () => {
    setApplicationForm((previous) => ({
      ...previous,
      occupation: capturedOccupation || previous.occupation,
    }));
    setFlowStep("application");
  };

  const handleApplicationChange = (event) => {
    const { name, value, type, files } = event.target;
    setApplicationForm((previous) => ({
      ...previous,
      [name]: type === "file" ? (files?.[0]?.name ?? "") : value,
    }));
  };

  const handleSubmitApplication = (event) => {
    event.preventDefault();
    if (!applicationForm.idPhotoName) {
      return;
    }
    setFlowStep("payment");
    setPaymentState("choose");
  };

  const handleSelectPaymentMethod = (method) => {
    setSelectedPaymentMethod(method);
    queueTimer(() => {
      setPaymentState("processing");
    }, 220);

    queueTimer(() => {
      setPaymentState("success");
    }, 1220);

    queueTimer(() => {
      closeFlow();
      appendMessage({
        sender: "ai",
        kind: "text",
        text: `Payment Successful via ${method}. Your Personal Accident e-policy will be shared in this chat shortly.`,
      });
    }, 2720);
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

    return (
      <>
        {message.sender === "agent" ? <span className="agentRoleTag">Human Agent</span> : null}
        <p>{message.text}</p>
      </>
    );
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
                        message.sender === "user"
                          ? "userBubble"
                          : message.sender === "agent"
                            ? "agentBubble"
                            : "aiBubble"
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
                      <h2 className="flowTitle">PA Quote Flow</h2>
                      <p className="flowCaption">WhatsApp Flow</p>
                    </div>
                  </div>
                </header>

                <div className="flowProgressBar" aria-label="Flow steps">
                  <span
                    className={`progressStep ${
                      flowStep === "collect" ? "activeStep" : ""
                    }`}
                  >
                    1
                  </span>
                  <span
                    className={`progressStep ${
                      flowStep === "quote" ? "activeStep" : ""
                    }`}
                  >
                    2
                  </span>
                  <span
                    className={`progressStep ${
                      flowStep === "application" ? "activeStep" : ""
                    }`}
                  >
                    3
                  </span>
                  <span
                    className={`progressStep ${
                      flowStep === "payment" ? "activeStep" : ""
                    }`}
                  >
                    4
                  </span>
                </div>

                {flowStep === "collect" ? (
                  <form className="flowForm" onSubmit={handleGeneratePreview}>
                    <section className="flowSection">
                      <h3 className="flowSectionTitle">Step 1 · Information Collection</h3>

                      <label>
                        Age
                        <input
                          required
                          min="18"
                          max="70"
                          name="age"
                          type="number"
                          placeholder="e.g. 32"
                          value={quoteForm.age}
                          onChange={handleQuoteFormChange}
                        />
                      </label>

                      <fieldset className="coverageFieldset">
                        <legend>Coverage amount</legend>
                        <label className="coverageOption">
                          <input
                            type="radio"
                            name="coverage"
                            value="500k"
                            checked={quoteForm.coverage === "500k"}
                            onChange={handleQuoteFormChange}
                          />
                          <span>CNY 500,000</span>
                        </label>
                        <label className="coverageOption">
                          <input
                            type="radio"
                            name="coverage"
                            value="1m"
                            checked={quoteForm.coverage === "1m"}
                            onChange={handleQuoteFormChange}
                          />
                          <span>CNY 1,000,000</span>
                        </label>
                      </fieldset>
                    </section>

                    <button type="submit" className="flowSubmit">
                      View Plan
                    </button>
                  </form>
                ) : null}

                {flowStep === "quote" && quotePreview ? (
                  <section className="flowPreviewPane">
                    <h3 className="flowSectionTitle">Step 2 · Quote Sheet</h3>
                    <table className="quoteTable">
                      <tbody>
                        <tr>
                          <th>Death / Disability Benefit</th>
                          <td>CNY 500,000</td>
                        </tr>
                        <tr>
                          <th>Accidental Medical</th>
                          <td>CNY 50,000</td>
                        </tr>
                        <tr>
                          <th>Price</th>
                          <td className="quotePriceCell">CNY 199 / year</td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="quotePreviewMeta">
                      Age {quotePreview.age} · Selected coverage {quotePreview.coverage === "1m" ? "CNY 1,000,000" : "CNY 500,000"}
                    </p>
                    <button
                      type="button"
                      className="flowSubmit"
                      onClick={handleContinueToApplication}
                    >
                      Buy Now
                    </button>
                  </section>
                ) : null}

                {flowStep === "application" ? (
                  <form className="flowForm" onSubmit={handleSubmitApplication}>
                    <section className="flowSection">
                      <h3 className="flowSectionTitle">Step 3 · Application Form</h3>

                      <label>
                        Insured name
                        <input
                          required
                          name="insuredName"
                          type="text"
                          placeholder="e.g. Alex Lin"
                          value={applicationForm.insuredName}
                          onChange={handleApplicationChange}
                        />
                      </label>

                      <label>
                        Insured photo of ID
                        <input
                          required
                          name="idPhotoName"
                          type="file"
                          accept="image/*"
                          onChange={handleApplicationChange}
                        />
                        {applicationForm.idPhotoName ? (
                          <span className="fileNameHint">{applicationForm.idPhotoName}</span>
                        ) : null}
                      </label>

                      <label>
                        Date of birth
                        <input
                          required
                          name="dateOfBirth"
                          type="date"
                          value={applicationForm.dateOfBirth}
                          onChange={handleApplicationChange}
                        />
                      </label>

                      <label>
                        Occupation
                        <input
                          required
                          name="occupation"
                          type="text"
                          value={applicationForm.occupation}
                          onChange={handleApplicationChange}
                        />
                      </label>

                      <label>
                        Coverage period
                        <select
                          name="coveragePeriod"
                          value={applicationForm.coveragePeriod}
                          onChange={handleApplicationChange}
                        >
                          <option>1 year</option>
                          <option>6 months</option>
                          <option>3 months</option>
                        </select>
                      </label>
                    </section>

                    <button type="submit" className="flowSubmit">
                      Pay Now
                    </button>
                  </form>
                ) : null}

                {flowStep === "payment" ? (
                  paymentState === "choose" ? (
                    <section className="flowStatusPane">
                      <h3 className="flowSectionTitle">Step 4 · Select payment method</h3>
                      <div className="paymentCardList">
                        <button
                          type="button"
                          className={`paymentOptionCard ${
                            selectedPaymentMethod === "WhatsApp" ? "selectedPaymentOption" : ""
                          }`}
                          onClick={() => handleSelectPaymentMethod("WhatsApp")}
                        >
                          <span className="paymentOptionIcon whatsappPayIcon">W</span>
                          <span className="paymentOptionText">
                            <span className="paymentOptionTitle">WhatsApp</span>
                            <span className="paymentOptionSubtitle">
                              Pay with WhatsApp integrated checkout
                            </span>
                          </span>
                          <span className="paymentOptionCheck" aria-hidden="true">
                            {selectedPaymentMethod === "WhatsApp" ? "✓" : "○"}
                          </span>
                        </button>
                        <button
                          type="button"
                          className={`paymentOptionCard ${
                            selectedPaymentMethod === "GPay" ? "selectedPaymentOption" : ""
                          }`}
                          onClick={() => handleSelectPaymentMethod("GPay")}
                        >
                          <span className="paymentOptionIcon gpayIcon">G</span>
                          <span className="paymentOptionText">
                            <span className="paymentOptionTitle">GPay</span>
                            <span className="paymentOptionSubtitle">
                              Fast payment with Google Pay
                            </span>
                          </span>
                          <span className="paymentOptionCheck" aria-hidden="true">
                            {selectedPaymentMethod === "GPay" ? "✓" : "○"}
                          </span>
                        </button>
                      </div>
                    </section>
                  ) : null
                ) : null}

                {flowStep === "payment" && paymentState === "processing" ? (
                  <section className="flowStatusPane">
                    <span className="flowLoadingSpinner" aria-hidden="true" />
                    <p>Processing payment with {selectedPaymentMethod}...</p>
                  </section>
                ) : null}

                {flowStep === "payment" && paymentState === "success" ? (
                  <section className="flowStatusPane">
                    <span className="flowSuccessIcon" aria-hidden="true">
                      ✓
                    </span>
                    <p className="successLabel">Payment Successful</p>
                  </section>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default App;
