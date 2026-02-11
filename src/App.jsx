import { useEffect, useRef, useState } from "react";

let messageId = 0;

const formatTime = () =>
  new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

const createMessage = (payload) => ({
  id: ++messageId,
  time: formatTime(),
  ...payload,
});

const createCustomerQuoteCard = () =>
  createMessage({
    kind: "quoteCard",
    role: "other",
    title: "Personal Accident Quote Card",
    summary: "Death/Disability 500k · Accidental Medical 50k",
    price: "CNY 199 / year",
    paid: false,
  });

const initialCustomerMessages = () => [
  createMessage({
    kind: "text",
    role: "other",
    text: "Hi John, your insurance advisor can share a quote with you in real time.",
  }),
];

const initialAgentMessages = () => [
  createMessage({
    kind: "system",
    text: "Insurance Agent Dashboard connected.",
  }),
];

function ChatMessage({
  message,
  side,
  onCustomerPayNow,
}) {
  if (message.kind === "system") {
    return (
      <div className="messageRow centerRow">
        <span className="systemText">{message.text}</span>
      </div>
    );
  }

  const isSelf = message.role === "self";
  const rowClass = isSelf ? "selfRow" : "otherRow";

  if (message.kind === "quoteCard") {
    return (
      <div className={`messageRow ${rowClass}`}>
        <article className={`messageBubble quoteBubble ${side}`}>
          <h4>{message.title}</h4>
          <p>{message.summary}</p>
          <strong>{message.price}</strong>
          <button
            type="button"
            className={`quotePayButton ${message.paid ? "paidButton" : ""}`}
            onClick={() => onCustomerPayNow?.(message.id)}
            disabled={message.paid}
          >
            {message.paid ? "Paid" : "Pay Now"}
          </button>
        </article>
      </div>
    );
  }

  return (
    <div className={`messageRow ${rowClass}`}>
      <article className={`messageBubble ${isSelf ? "selfBubble" : "otherBubble"} ${side}`}>
        <p>{message.text}</p>
        <span className="bubbleTime">{message.time}</span>
      </article>
    </div>
  );
}

function PhoneView({
  side,
  headerTitle,
  subtitle,
  dashboardTag,
  messages,
  viewportRef,
  draft,
  onDraftChange,
  onSend,
  onShareQuote,
  onToggleManage,
  onCustomerPayNow,
  manageOpen,
  onManageAction,
  onCloseManage,
}) {
  return (
    <section className="viewColumn">
      <h2 className="viewTitle">{headerTitle}</h2>
      <div className={`phoneFrame ${side}`}>
        <header className={`phoneHeader ${side}`}>
          <div className="phoneHeaderTitle">{subtitle}</div>
          {dashboardTag ? <div className="dashboardTag">{dashboardTag}</div> : null}
        </header>

        <main ref={viewportRef} className={`chatViewport ${side}`}>
          <div className="datePill">Today</div>
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              side={side}
              onCustomerPayNow={onCustomerPayNow}
            />
          ))}
        </main>

        {side === "agent" && manageOpen ? (
          <>
            <button
              type="button"
              className="manageBackdrop"
              aria-label="Close manage list"
              onClick={onCloseManage}
            />
            <section className="manageListMenu">
              <h3>List Message</h3>
              <button type="button" onClick={() => onManageAction("View Lead")}>
                View Lead
              </button>
              <button type="button" onClick={() => onManageAction("Sales Report")}>
                Sales Report
              </button>
            </section>
          </>
        ) : null}

        <footer className={`composer ${side}`}>
          <input
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder={side === "customer" ? "Type message..." : "Reply as agent..."}
          />

          {side === "agent" ? (
            <>
              <button type="button" className="secondaryBtn manageBtn" onClick={onToggleManage}>
                ⚡ Manage
              </button>
              <button type="button" className="secondaryBtn" onClick={onShareQuote}>
                Share Quote
              </button>
            </>
          ) : null}

          <button type="button" className="sendBtn" onClick={onSend}>
            Send
          </button>
        </footer>
      </div>
    </section>
  );
}

function App() {
  const [customerMessages, setCustomerMessages] = useState(initialCustomerMessages);
  const [agentMessages, setAgentMessages] = useState(initialAgentMessages);
  const [customerDraft, setCustomerDraft] = useState("");
  const [agentDraft, setAgentDraft] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const customerViewportRef = useRef(null);
  const agentViewportRef = useRef(null);

  useEffect(() => {
    if (customerViewportRef.current) {
      customerViewportRef.current.scrollTo({
        top: customerViewportRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [customerMessages]);

  useEffect(() => {
    if (agentViewportRef.current) {
      agentViewportRef.current.scrollTo({
        top: agentViewportRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [agentMessages]);

  const appendCustomerMessage = (payload) => {
    setCustomerMessages((previous) => [...previous, createMessage(payload)]);
  };

  const appendAgentMessage = (payload) => {
    setAgentMessages((previous) => [...previous, createMessage(payload)]);
  };

  const handleSendFromCustomer = () => {
    const cleaned = customerDraft.trim();
    if (!cleaned) {
      return;
    }
    appendCustomerMessage({ kind: "text", role: "self", text: cleaned });
    appendAgentMessage({ kind: "text", role: "other", text: `John Doe: ${cleaned}` });
    setCustomerDraft("");
  };

  const handleSendFromAgent = () => {
    const cleaned = agentDraft.trim();
    if (!cleaned) {
      return;
    }
    appendAgentMessage({ kind: "text", role: "self", text: cleaned });
    appendCustomerMessage({ kind: "text", role: "other", text: `Alex Lokron: ${cleaned}` });
    setAgentDraft("");
  };

  const handleManageAction = (option) => {
    setManageOpen(false);

    if (option === "View Lead") {
      appendAgentMessage({
        kind: "text",
        role: "other",
        text: "Lead Summary\n- Occupation: Riders\n- Age: 30\n- Product: Personal Accident",
      });
      return;
    }

    appendAgentMessage({
      kind: "text",
      role: "other",
      text: "Sales Report\n- New leads: 12\n- Qualified: 8\n- PA conversion: 34%",
    });
  };

  const handleShareQuote = () => {
    setManageOpen(false);
    appendAgentMessage({
      kind: "system",
      text: "Personal Accident quote has been shared to John Doe.",
    });
    setCustomerMessages((previous) => [...previous, createCustomerQuoteCard()]);
  };

  const handleCustomerPayNow = (cardId) => {
    let paidThisClick = false;

    setCustomerMessages((previous) =>
      previous.map((message) => {
        if (message.id !== cardId || message.kind !== "quoteCard" || message.paid) {
          return message;
        }
        paidThisClick = true;
        return { ...message, paid: true };
      }),
    );

    if (!paidThisClick) {
      return;
    }

    appendCustomerMessage({
      kind: "system",
      text: "Payment Successful",
    });

    appendAgentMessage({
      kind: "system",
      text: "John Doe has paid the premium, your commission has been received.",
    });
  };

  return (
    <div className="simulatorPage">
      <div className="simulatorLayout">
        <PhoneView
          side="customer"
          headerTitle="Customer：John Doe"
          subtitle="WhatsApp Customer Chat"
          messages={customerMessages}
          viewportRef={customerViewportRef}
          draft={customerDraft}
          onDraftChange={setCustomerDraft}
          onSend={handleSendFromCustomer}
          onCustomerPayNow={handleCustomerPayNow}
        />

        <PhoneView
          side="agent"
          headerTitle="Agent：Alex Lokron"
          subtitle="Agent Console"
          dashboardTag="Insurance Agent Dashboard"
          messages={agentMessages}
          viewportRef={agentViewportRef}
          draft={agentDraft}
          onDraftChange={setAgentDraft}
          onSend={handleSendFromAgent}
          onShareQuote={handleShareQuote}
          onToggleManage={() => setManageOpen((open) => !open)}
          manageOpen={manageOpen}
          onManageAction={handleManageAction}
          onCloseManage={() => setManageOpen(false)}
        />
      </div>
    </div>
  );
}

export default App;
