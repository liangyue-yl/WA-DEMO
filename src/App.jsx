import { useEffect, useMemo, useRef, useState } from "react";

let messageId = 0;

const quoteFormDefaults = {
  age: "",
  coverage: "500k",
};

const formatTime = () =>
  new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

const createMessage = (payload) => ({
  id: ++messageId,
  time: formatTime(),
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
  const [leadStage, setLeadStage] = useState("idle");
  const [capturedOccupation, setCapturedOccupation] = useState("");
  const [capturedName, setCapturedName] = useState("");
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

  const [agentMessages, setAgentMessages] = useState(() => [
    createMessage({
      sender: "system",
      kind: "system",
      text: "Ignite Agent Dashboard connected.",
    }),
  ]);
  const [agentDraft, setAgentDraft] = useState("");
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [latestLead, setLatestLead] = useState(null);

  const customerViewportRef = useRef(null);
  const agentViewportRef = useRef(null);
  const timerBucketRef = useRef([]);

  const isTyping = typingCount > 0;
  const canSend = mode === "unstructured" && draft.trim().length > 0;

  const queueTimer = (callback, delay) => {
    const timerId = setTimeout(callback, delay);
    timerBucketRef.current.push(timerId);
  };

  const appendWithSetter = (setter, payload, options = {}) => {
    const { animate = true } = options;
    const nextMessage = createMessage(payload);

    setter((previous) => [...previous, { ...nextMessage, entering: animate }]);

    if (animate) {
      queueTimer(() => {
        setter((previous) =>
          previous.map((item) =>
            item.id === nextMessage.id ? { ...item, entering: false } : item,
          ),
        );
      }, 230);
    }
  };

  const appendCustomerMessage = (payload, options = {}) =>
    appendWithSetter(setMessages, payload, options);
  const appendAgentMessage = (payload, options = {}) =>
    appendWithSetter(setAgentMessages, payload, options);

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
    if (!customerViewportRef.current) {
      return;
    }
    customerViewportRef.current.scrollTo({
      top: customerViewportRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping, flowMounted]);

  useEffect(() => {
    if (!agentViewportRef.current) {
      return;
    }
    agentViewportRef.current.scrollTo({
      top: agentViewportRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [agentMessages]);

  useEffect(
    () => () => {
      timerBucketRef.current.forEach((timerId) => clearTimeout(timerId));
      timerBucketRef.current = [];
    },
    [],
  );

  const queueAiMessage = (payload, delay = 950) => {
    setTypingCount((count) => count + 1);
    queueTimer(() => {
      setTypingCount((count) => Math.max(0, count - 1));
      appendCustomerMessage({
        sender: "ai",
        ...payload,
      });
    }, delay);
  };

  const runLeadQualificationScript = () => {
    setLeadStage("awaitingOccupation");

    appendCustomerMessage({
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

  const showLeadTransfer = (occupation, customerName) => {
    const normalizedOccupation = occupation.trim();
    const normalizedName = customerName.trim();

    queueTimer(() => {
      appendCustomerMessage({
        sender: "system",
        kind: "system",
        text: "You've been transferred to our Professional Agent",
      });
    }, 420);

    queueTimer(() => {
      appendCustomerMessage({
        sender: "agent",
        kind: "text",
        text: `I am your advisor. ${normalizedName}, this is a Personal Accident plan tailored for your occupation (${normalizedOccupation}). Please review it.`,
      });
    }, 1000);

    queueTimer(() => {
      appendCustomerMessage({
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
    setLeadStage("idle");
    setCapturedOccupation("");
    setCapturedName("");
    setLatestLead(null);
    runLeadQualificationScript();
  };

  const handleSelectStructured = () => {
    setMode("structured");
    setLeadStage("idle");
    setLatestLead(null);
    appendCustomerMessage({
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

    appendCustomerMessage({
      sender: "user",
      kind: "text",
      text: cleanedText,
    });
    setDraft("");

    if (leadStage === "awaitingOccupation") {
      setCapturedOccupation(cleanedText);
      setLeadStage("awaitingName");
      queueAiMessage(
        {
          kind: "text",
          text: "Thanks. May I also know your full name?",
        },
        700,
      );
      return;
    }

    if (leadStage === "awaitingName") {
      setCapturedName(cleanedText);
      setLeadStage("completed");
      const leadProfile = {
        name: cleanedText,
        occupation: capturedOccupation || "Unknown",
        age: "30",
        product: "Personal Accident",
      };
      setLatestLead(leadProfile);
      appendAgentMessage({
        sender: "ai",
        kind: "leadNotice",
        text: "You have a new Lead",
        viewed: false,
        lead: leadProfile,
      });
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
    appendCustomerMessage({
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
      appendCustomerMessage({
        sender: "ai",
        kind: "text",
        text: `Payment Successful via ${method}. Your Personal Accident e-policy will be shared in this chat shortly.`,
      });
      appendAgentMessage({
        sender: "system",
        kind: "system",
        text: "John Doe has paid the premium, your commission has been received.",
      });
    }, 2720);
  };

  const handleAgentSendMessage = () => {
    const cleanedText = agentDraft.trim();
    if (!cleanedText) {
      return;
    }

    appendAgentMessage({
      sender: "agent",
      kind: "text",
      text: cleanedText,
    });
    setAgentDraft("");
  };

  const handleAgentManageAction = (action) => {
    setShowManageMenu(false);

    if (action === "View Lead") {
      const lead = latestLead || {
        name: "John Doe",
        occupation: "Riders",
        age: "30",
        product: "Personal Accident",
      };
      appendAgentMessage({
        sender: "ai",
        kind: "leadSummary",
        lead,
        contacted: false,
      });
      return;
    }

    appendAgentMessage({
      sender: "ai",
      kind: "text",
      text: "Sales Report\n- New Leads: 12\n- Qualified Leads: 8\n- PA Conversions: 5",
    });
  };

  const handleAgentViewLeadFromNotice = (messageId, lead) => {
    const fallbackLead = latestLead || {
      name: capturedName || "John Doe",
      occupation: capturedOccupation || "Riders",
      age: "30",
      product: "Personal Accident",
    };
    const targetLead = lead || fallbackLead;

    setAgentMessages((previous) =>
      previous.map((message) =>
        message.id === messageId ? { ...message, viewed: true } : message,
      ),
    );

    appendAgentMessage({
      sender: "ai",
      kind: "leadSummary",
      lead: targetLead,
      contacted: false,
    });
  };

  const handleAgentContactLead = (messageId, lead) => {
    const fallbackLead = latestLead || {
      name: capturedName || "John Doe",
      occupation: capturedOccupation || "Riders",
      age: "30",
      product: "Personal Accident",
    };
    const targetLead = lead || fallbackLead;

    setAgentMessages((previous) =>
      previous.map((message) =>
        message.id === messageId ? { ...message, contacted: true } : message,
      ),
    );

    showLeadTransfer(targetLead.occupation, targetLead.name);
  };

  const renderCustomerMessage = (message) => {
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

    if (message.kind === "sharedQuoteCard") {
      return (
        <article className="quoteCard">
          <div className="quoteCardTop">
            <span className="quoteTag">Shared by Agent</span>
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

  const renderAgentMessage = (message) => {
    if (message.kind === "system") {
      return (
        <div className="agentMessageRow centerRow">
          <span className="agentSystemNotice">{message.text}</span>
        </div>
      );
    }

    if (message.kind === "leadNotice") {
      return (
        <div className="agentMessageRow agentOtherRow">
          <article className="agentBubble agentOtherBubble leadNoticeCard">
            <p className="leadNoticeTitle">{message.text}</p>
            <button
              type="button"
              className="agentInlineViewLeadBtn"
              onClick={() => handleAgentViewLeadFromNotice(message.id, message.lead)}
              disabled={message.viewed}
            >
              {message.viewed ? "Viewed" : "View Lead"}
            </button>
          </article>
        </div>
      );
    }

    if (message.kind === "leadSummary") {
      const lead = message.lead || {
        name: "John Doe",
        occupation: "Riders",
        age: "30",
        product: "Personal Accident",
      };

      return (
        <div className="agentMessageRow agentOtherRow">
          <article className="agentBubble agentOtherBubble leadSummaryCard">
            <p className="leadSummaryTitle">AI Lead Summary</p>
            <ul className="leadSummaryList">
              <li>Name: {lead.name}</li>
              <li>Occupation: {lead.occupation}</li>
              <li>Age: {lead.age}</li>
              <li>Product: {lead.product}</li>
            </ul>
            <button
              type="button"
              className="agentInlineContactBtn"
              onClick={() => handleAgentContactLead(message.id, lead)}
              disabled={message.contacted}
            >
              {message.contacted ? "Contacted" : "Contact"}
            </button>
          </article>
        </div>
      );
    }

    const isSelf = message.sender === "agent";

    return (
      <div className={`agentMessageRow ${isSelf ? "agentSelfRow" : "agentOtherRow"}`}>
        <article className={`agentBubble ${isSelf ? "agentSelfBubble" : "agentOtherBubble"}`}>
          <p>{message.text}</p>
          <span className="agentMetaTime">{message.time}</span>
        </article>
      </div>
    );
  };

  return (
    <div className="dualContainer">
      <section className="viewPane">
        <h2 className="panelTitle">Customer： John Doe</h2>
        <div className="iphoneFrame customerFrame">
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
              </div>
            </header>

            <main className="chatViewport" ref={customerViewportRef}>
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

              {messages.map((message) =>
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
                      {renderCustomerMessage(message)}
                      {message.kind === "text" ? (
                        <div
                          className={`messageMeta ${
                            message.sender === "user" ? "userMeta" : "aiMeta"
                          }`}
                        >
                          <span>{message.time}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ),
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
              <button type="button" className="menuButton" onClick={showAssistantButtons}>
                Menu
              </button>

              {mode === "unstructured" ? (
                <div className="inputDock">
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
                Send
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
                      className={`progressStep ${flowStep === "quote" ? "activeStep" : ""}`}
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
                      className={`progressStep ${flowStep === "payment" ? "activeStep" : ""}`}
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
                        Age {quotePreview.age} · Selected coverage{" "}
                        {quotePreview.coverage === "1m" ? "CNY 1,000,000" : "CNY 500,000"}
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

                  {flowStep === "payment" && paymentState === "choose" ? (
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
      </section>

      <section className="viewPane">
        <h2 className="panelTitle">Agent：Alex Loru</h2>
        <div className="iphoneFrame agentFrame">
          <div className="dynamicIsland" />
          <div className="agentScreen">
            <header className="agentHeader">
              <h3>Agent Workspace</h3>
              <span className="agentOnline">online</span>
              <p className="dashboardLabel">Ignite Agent Dashboard</p>
            </header>

            <main className="agentViewport" ref={agentViewportRef}>
              <div className="dateBadge agentDateBadge">Today</div>
              {agentMessages.map((message) => (
                <div key={message.id}>{renderAgentMessage(message)}</div>
              ))}
            </main>

            {showManageMenu ? (
              <>
                <button
                  type="button"
                  className="agentManageBackdrop"
                  aria-label="Close manage menu"
                  onClick={() => setShowManageMenu(false)}
                />
                <section className="agentManageMenu">
                  <h4>List Message</h4>
                  <button type="button" onClick={() => handleAgentManageAction("View Lead")}>
                    View Lead
                  </button>
                  <button type="button" onClick={() => handleAgentManageAction("Sales Report")}>
                    Sales Report
                  </button>
                </section>
              </>
            ) : null}

            <footer className="agentComposer">
              <input
                value={agentDraft}
                onChange={(event) => setAgentDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAgentSendMessage();
                  }
                }}
                placeholder="Reply as Agent..."
              />
              <button
                type="button"
                className="agentManageTrigger"
                onClick={() => setShowManageMenu((open) => !open)}
              >
                ⚡ Manage
              </button>
              <button type="button" className="agentSendBtn" onClick={handleAgentSendMessage}>
                Send
              </button>
            </footer>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
