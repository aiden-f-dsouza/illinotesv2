// ============================================
// AI TUTOR CHAT WIDGET
// Dependencies: notes-page.js (getCSRFToken, showToast, escapeHtml)
// ============================================

(function () {
  'use strict';

  // === STATE ===
  let selectedNoteId = null;
  let selectedNoteTitle = null;
  let conversationHistory = []; // Session-only, resets on refresh
  let isWaitingForResponse = false;
  let includeImages = false;
  let noteHasImages = false;

  // === DOM REFERENCES ===
  let chatWidget, chatPanel, chatToggle, chatMessages, chatInput;
  let chatSendBtn, chatClearBtn, chatMinimizeBtn;
  let chatNoteLabel, chatClearNote, chatStatus;
  let chatImageBtn;

  // === INITIALIZATION ===
  function initAIChat() {
    chatWidget = document.getElementById('ai-chat-widget');
    if (!chatWidget) return; // Not rendered (user not logged in)

    chatPanel = document.getElementById('ai-chat-panel');
    chatToggle = document.getElementById('ai-chat-toggle');
    chatMessages = document.getElementById('ai-chat-messages');
    chatInput = document.getElementById('ai-chat-input');
    chatSendBtn = document.getElementById('ai-chat-send');
    chatClearBtn = document.getElementById('ai-chat-clear');
    chatMinimizeBtn = document.getElementById('ai-chat-minimize');
    chatNoteLabel = document.getElementById('ai-chat-note-label');
    chatClearNote = document.getElementById('ai-chat-clear-note');
    chatStatus = document.getElementById('ai-chat-status');
    chatImageBtn = document.getElementById('ai-chat-image-btn');

    // Event listeners
    chatToggle.addEventListener('click', toggleChatPanel);
    chatSendBtn.addEventListener('click', sendMessage);
    chatClearBtn.addEventListener('click', clearChat);
    chatMinimizeBtn.addEventListener('click', toggleChatPanel);
    chatClearNote.addEventListener('click', clearNoteSelection);

    chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    if (chatImageBtn) {
      chatImageBtn.addEventListener('click', toggleImageInclusion);
    }

    // Add "Ask AI" buttons to note cards
    addNoteSelectionHandlers();

    // Watch for dynamically loaded notes (Load More)
    observeNewNotes();
  }

  // === PANEL TOGGLE ===
  function toggleChatPanel() {
    chatWidget.classList.toggle('open');
    if (chatWidget.classList.contains('open')) {
      chatToggle.innerHTML = '<i class="ph ph-x"></i>';
      if (!chatInput.disabled) {
        chatInput.focus();
      }
    } else {
      chatToggle.innerHTML = '<i class="ph ph-robot"></i>';
    }
  }

  // === NOTE SELECTION ===
  function addNoteSelectionHandlers() {
    document.querySelectorAll('.card[id^="note-"]').forEach(function (card) {
      if (card.dataset.aiHandlerAttached) return;
      card.dataset.aiHandlerAttached = 'true';

      // Add "Ask AI" button to note actions
      var actionsDiv = card.querySelector('.note-actions');
      if (actionsDiv) {
        var askBtn = document.createElement('button');
        askBtn.type = 'button';
        askBtn.className = 'btn-ask-ai';
        askBtn.innerHTML = '<i class="ph ph-robot"></i> Ask AI';
        askBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          var noteId = parseInt(card.id.replace('note-', ''));
          var noteTitle = card.querySelector('.note-title')?.textContent || 'Untitled';
          selectNote(noteId, noteTitle, card);
          if (!chatWidget.classList.contains('open')) {
            toggleChatPanel();
          }
        });
        actionsDiv.appendChild(askBtn);
      }
    });
  }

  function selectNote(noteId, noteTitle, cardElement) {
    selectedNoteId = noteId;
    selectedNoteTitle = noteTitle;

    // Update UI
    chatNoteLabel.textContent = noteTitle;
    chatClearNote.style.display = 'inline-flex';
    chatStatus.textContent = 'Ready to help';
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
    chatInput.placeholder = 'Ask about this note...';

    // Check if note has image attachments
    noteHasImages = false;
    if (cardElement) {
      var attachments = cardElement.querySelectorAll('.attachment-link');
      attachments.forEach(function (a) {
        if (a.querySelector('.ph-image')) {
          noteHasImages = true;
        }
      });
    }

    // Show/hide image button
    if (chatImageBtn) {
      chatImageBtn.style.display = noteHasImages ? 'flex' : 'none';
    }
    includeImages = false;
    if (chatImageBtn) chatImageBtn.classList.remove('active');

    // Add context message
    addMessage('assistant', 'Now discussing: <strong>' + escapeHtml(noteTitle) + '</strong>. What would you like to know?');
  }

  function clearNoteSelection() {
    selectedNoteId = null;
    selectedNoteTitle = null;
    chatNoteLabel.textContent = 'No note selected';
    chatClearNote.style.display = 'none';
    chatStatus.textContent = 'Select a note to start';
    chatInput.disabled = true;
    chatSendBtn.disabled = true;
    chatInput.placeholder = 'Select a note first...';
    if (chatImageBtn) {
      chatImageBtn.style.display = 'none';
      chatImageBtn.classList.remove('active');
    }
    includeImages = false;
    noteHasImages = false;
  }

  // === IMAGE TOGGLE ===
  function toggleImageInclusion() {
    includeImages = !includeImages;
    chatImageBtn.classList.toggle('active', includeImages);
  }

  // === SEND MESSAGE ===
  async function sendMessage() {
    var message = chatInput.value.trim();
    if (!message || !selectedNoteId || isWaitingForResponse) return;

    // Add user message to UI
    addMessage('user', escapeHtml(message));
    chatInput.value = '';
    isWaitingForResponse = true;
    chatSendBtn.disabled = true;
    chatInput.disabled = true;

    // Show typing indicator
    showTypingIndicator();

    try {
      var response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({
          message: message,
          note_id: selectedNoteId,
          conversation_history: conversationHistory,
          include_images: includeImages
        })
      });

      removeTypingIndicator();

      if (response.status === 429) {
        addMessage('assistant', "You've reached the daily message limit (30/day). Try again tomorrow!");
        showToast('Daily chat limit reached', 'error');
        return;
      }

      if (!response.ok) {
        var errorData = await response.json().catch(function () { return {}; });
        throw new Error(errorData.error || 'Failed to get response');
      }

      var data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }

      // Add assistant message with markdown formatting
      addMessage('assistant', formatMarkdown(data.reply));

      // Reset image toggle after each send
      includeImages = false;
      if (chatImageBtn) chatImageBtn.classList.remove('active');

    } catch (error) {
      removeTypingIndicator();
      console.error('AI chat error:', error);
      addMessage('assistant', "Sorry, I couldn't process that. Please try again.");
      showToast('AI chat error: ' + error.message, 'error');
    } finally {
      isWaitingForResponse = false;
      chatSendBtn.disabled = false;
      chatInput.disabled = false;
      chatInput.focus();
    }
  }

  // === MESSAGE RENDERING ===
  function addMessage(role, htmlContent) {
    var msgDiv = document.createElement('div');
    msgDiv.className = 'ai-chat-message ai-chat-message-' + role;
    msgDiv.innerHTML = '<div class="ai-chat-message-content">' + htmlContent + '</div>';
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Track in conversation history (plain text for API)
    conversationHistory.push({
      role: role,
      content: msgDiv.textContent
    });
  }

  function showTypingIndicator() {
    var indicator = document.createElement('div');
    indicator.id = 'ai-typing-indicator';
    indicator.className = 'ai-chat-message ai-chat-message-assistant';
    indicator.innerHTML =
      '<div class="ai-chat-typing">' +
      '<span></span><span></span><span></span>' +
      '</div>';
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function removeTypingIndicator() {
    var indicator = document.getElementById('ai-typing-indicator');
    if (indicator) indicator.remove();
  }

  // === CLEAR CHAT ===
  function clearChat() {
    if (!confirm('Clear chat history?')) return;
    conversationHistory = [];
    chatMessages.innerHTML =
      '<div class="ai-chat-message ai-chat-message-assistant">' +
      '<div class="ai-chat-message-content">' +
      '<p>Chat cleared. Select a note and ask me anything!</p>' +
      '</div></div>';
  }

  // === MARKDOWN FORMATTING ===
  function formatMarkdown(text) {
    var html = escapeHtml(text);

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Unordered lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  // === OBSERVE NEW NOTES (for Load More) ===
  function observeNewNotes() {
    var notesContainer = document.getElementById('notes-container');
    if (!notesContainer) return;

    var observer = new MutationObserver(function () {
      addNoteSelectionHandlers();
    });

    observer.observe(notesContainer, { childList: true });
  }

  // === INIT ON DOM READY ===
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAIChat);
  } else {
    initAIChat();
  }
})();
