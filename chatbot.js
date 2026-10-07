(() => {
    const createElement = (tag, className, text) => {
        const element = document.createElement(tag);
        if (className) {
            element.className = className;
        }
        if (text !== undefined) {
            element.textContent = text;
        }
        return element;
    };

    const createIcon = (paths) => {
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('aria-hidden', 'true');
        icon.setAttribute('focusable', 'false');

        paths.forEach((d) => {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', d);
            icon.appendChild(path);
        });

        return icon;
    };

    const widget = createElement('div', 'rrc-chat-widget');
    const launcher = createElement('button', 'rrc-chat-launcher');
    launcher.type = 'button';
    launcher.setAttribute('aria-label', 'Chat with RRC Nexus');
    launcher.setAttribute('aria-controls', 'rrc-chat-panel');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.title = 'Chat with RRC Nexus';
    launcher.appendChild(createIcon([
        'M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 2 1.5-4.5A7.5 7.5 0 1 1 20 11.5Z',
        'M8 11.5h.01M12 11.5h.01M16 11.5h.01'
    ]));

    const panel = createElement('section', 'rrc-chat-panel');
    panel.id = 'rrc-chat-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'RRC Nexus Assistant chat');

    const header = createElement('header', 'rrc-chat-header');
    const heading = createElement('div', 'rrc-chat-heading');
    heading.append(
        createElement('strong', 'rrc-chat-title', 'RRC Nexus Assistant'),
        createElement('span', 'rrc-chat-subtitle', 'How can we help you?')
    );

    const closeButton = createElement('button', 'rrc-chat-close');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close chat');
    closeButton.title = 'Close chat';
    closeButton.appendChild(createIcon(['M6 6l12 12M18 6 6 18']));
    header.append(heading, closeButton);

    const messages = createElement('div', 'rrc-chat-messages');
    messages.id = 'rrc-chat-messages';
    messages.setAttribute('role', 'log');
    messages.setAttribute('aria-live', 'polite');
    messages.setAttribute('aria-relevant', 'additions');
    messages.setAttribute('aria-label', 'Chat messages');

    const typingIndicator = createElement(
        'div',
        'rrc-chat-typing',
        'RRC Nexus Assistant is typing...'
    );
    typingIndicator.hidden = true;
    typingIndicator.setAttribute('role', 'status');
    messages.appendChild(typingIndicator);

    const quickActions = createElement('div', 'rrc-chat-quick-actions');
    quickActions.setAttribute('role', 'group');
    quickActions.setAttribute('aria-label', 'Suggested questions');

    const form = createElement('form', 'rrc-chat-form');
    const input = createElement('input', 'rrc-chat-input');
    input.type = 'text';
    input.name = 'message';
    input.placeholder = 'Ask about RRC Nexus...';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', 'Ask about RRC Nexus');

    const sendButton = createElement('button', 'rrc-chat-send', 'Send');
    sendButton.type = 'submit';
    sendButton.setAttribute('aria-label', 'Send message');
    form.append(input, sendButton);

    const requestTimeoutMs = 30000;
    const responseErrorMessage =
        'Sorry, I’m unable to respond right now. Please try again or contact the RRC Nexus team.';
    const connectionErrorMessage =
        'Sorry, I’m unable to connect right now. Please try again in a moment.';
    let isRequestPending = false;

    panel.append(header, messages, quickActions, form);
    widget.append(launcher, panel);
    document.body.appendChild(widget);

    const addMessage = (text, sender) => {
        const message = createElement('div', `rrc-chat-message rrc-chat-message-${sender}`);
        message.textContent = text;
        messages.insertBefore(message, typingIndicator);
        messages.scrollTop = messages.scrollHeight;
    };

    const setTypingIndicatorVisible = (visible) => {
        typingIndicator.hidden = !visible;
        if (visible) {
            messages.scrollTop = messages.scrollHeight;
        }
    };

    const actions = [
        ['Workspace Plans', 'What workspace plans are available?'],
        ['Pricing', 'What are the workspace prices?'],
        ['Facilities', 'What facilities are available?'],
        ['Startup Support', 'What startup support is available?'],
        ['Free Visit', 'How can I enquire about a free visit?']
    ];

    actions.forEach(([label, question]) => {
        const button = createElement('button', 'rrc-chat-quick-action', label);
        button.type = 'button';
        button.addEventListener('click', () => {
            input.value = question;
            input.focus();
        });
        quickActions.appendChild(button);
    });

    let hasOpened = false;

    const openChat = () => {
        panel.hidden = false;
        launcher.setAttribute('aria-expanded', 'true');
        if (!hasOpened) {
            addMessage(
                "Hi! I'm the RRC Nexus Assistant. I can help you with workspace options, plans, facilities, startup support, and enquiries.",
                'assistant'
            );
            hasOpened = true;
        }
        input.focus();
    };

    const closeChat = () => {
        panel.hidden = true;
        launcher.setAttribute('aria-expanded', 'false');
        launcher.focus();
    };

    launcher.addEventListener('click', () => {
        if (panel.hidden) {
            openChat();
        } else {
            closeChat();
        }
    });
    closeButton.addEventListener('click', closeChat);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text || isRequestPending) {
            return;
        }

        isRequestPending = true;
        sendButton.disabled = true;
        addMessage(text, 'user');
        input.value = '';
        quickActions.hidden = true;
        setTypingIndicatorVisible(true);

        const controller = new AbortController();
        let timedOut = false;
        const timeoutId = window.setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, requestTimeoutMs);

        try {
            let response;
            try {
                response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message: text }),
                    signal: controller.signal
                });
            } catch {
                addMessage(
                    timedOut ? responseErrorMessage : connectionErrorMessage,
                    'assistant'
                );
                return;
            }

            if (!response.ok) {
                addMessage(responseErrorMessage, 'assistant');
                return;
            }

            let data;
            try {
                data = await response.json();
            } catch {
                addMessage(responseErrorMessage, 'assistant');
                return;
            }

            if (
                !data ||
                data.success !== true ||
                typeof data.message !== 'string' ||
                !data.message.trim()
            ) {
                addMessage(responseErrorMessage, 'assistant');
                return;
            }

            addMessage(data.message.trim(), 'assistant');
        } finally {
            window.clearTimeout(timeoutId);
            setTypingIndicatorVisible(false);
            isRequestPending = false;
            sendButton.disabled = false;
            if (!panel.hidden) {
                input.focus();
            }
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !panel.hidden) {
            closeChat();
        }
    });
})();
